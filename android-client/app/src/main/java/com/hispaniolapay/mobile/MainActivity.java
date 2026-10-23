package com.hispaniolapay.mobile;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.Dialog;
import android.app.DatePickerDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.res.Configuration;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.common.BitMatrix;
import com.caverock.androidsvg.SVG;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Cliente nativo. Las credenciales del proveedor y la contabilidad permanecen en el servidor. */
public final class MainActivity extends Activity {
    private static final int GOOGLE_SIGN_IN = 701;
    private static final int NOTIFICATION_PERMISSION = 702;
    private static final int NAVY = Color.rgb(8, 34, 75);
    private static final int BLUE = Color.rgb(16, 91, 196);
    private static final int CYAN = Color.rgb(30, 174, 219);
    private static final int GREEN = Color.rgb(11, 151, 111);
    private static final int PURPLE = Color.rgb(112, 72, 232);
    private static final int RED = Color.rgb(210, 54, 69);
    private static final int AMBER = Color.rgb(231, 151, 31);
    private static final int NATCASH_BLUE = Color.rgb(0, 132, 190);
    private static final int MONCASH_WINE = Color.rgb(126, 24, 54);
    private int INK;
    private int MUTED;
    private int BG;
    private int LINE;
    private int SURFACE;
    private int SURFACE_ALT;
    private boolean darkMode;
    private String language = "es";
    private String pendingRecipient = "";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final ExecutorService imageExecutor = Executors.newFixedThreadPool(3);
    private final NumberFormat usd = NumberFormat.getCurrencyInstance(Locale.US);
    private ApiClient api;
    private ThermalReceiptManager receiptManager;
    private GoogleSignInClient googleClient;
    private JSONObject accountData;
    private LinearLayout content;
    private String activeScreen = "Inicio";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        language = getSharedPreferences("hispaniola_ui", MODE_PRIVATE).getString("language", "es");
        capturePaymentLink(getIntent());
        applySavedAppearance();
        Window window = getWindow();
        window.setStatusBarColor(NAVY);
        window.setNavigationBarColor(SURFACE);
        api = new ApiClient(this);
        receiptManager = new ThermalReceiptManager(this);
        GoogleSignInOptions googleOptions = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(getString(R.string.default_web_client_id)).requestEmail().build();
        googleClient = GoogleSignIn.getClient(this, googleOptions);
        createNotificationChannel();
        requestNotificationPermission();
        if (api.hasSession()) loadAccount(true); else showLogin();
    }

    private void applySavedAppearance() {
        String appearance = getSharedPreferences("hispaniola_ui", MODE_PRIVATE).getString("appearance", "system");
        boolean systemDark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        darkMode = "dark".equals(appearance) || ("system".equals(appearance) && systemDark);
        if (darkMode) {
            BG = Color.rgb(8, 17, 32);
            SURFACE = Color.rgb(17, 28, 48);
            SURFACE_ALT = Color.rgb(24, 39, 64);
            INK = Color.rgb(238, 244, 255);
            MUTED = Color.rgb(159, 174, 199);
            LINE = Color.rgb(48, 65, 91);
        } else {
            BG = Color.rgb(244, 247, 252);
            SURFACE = Color.WHITE;
            SURFACE_ALT = Color.rgb(237, 246, 255);
            INK = Color.rgb(20, 36, 62);
            MUTED = Color.rgb(99, 112, 134);
            LINE = Color.rgb(221, 228, 239);
        }
    }

    private void setAppearance(String value) {
        getSharedPreferences("hispaniola_ui", MODE_PRIVATE).edit().putString("appearance", value).apply();
        recreate();
    }

    private void capturePaymentLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri uri = intent.getData();
        String recipient = uri.getQueryParameter("to");
        if (recipient != null && !recipient.trim().isEmpty()) pendingRecipient = recipient.trim().toUpperCase(Locale.ROOT);
    }

    private void chooseLanguage() {
        String[] codes = {"es", "en", "ht"};
        String[] labels = {tr("Español"), tr("Inglés"), tr("Criollo haitiano")};
        int checked = "en".equals(language) ? 1 : "ht".equals(language) ? 2 : 0;
        new AlertDialog.Builder(this).setTitle(tr("Idioma")).setSingleChoiceItems(labels, checked, (dialog, which) -> {
            language = codes[which];
            getSharedPreferences("hispaniola_ui", MODE_PRIVATE).edit().putString("language", language).apply();
            JSONObject current = account();
            executor.execute(() -> {
                try {
                    api.updateProfile(new JSONObject()
                            .put("name", current.optString("name", "Cliente"))
                            .put("phone", current.optString("phone", ""))
                            .put("idNumber", current.optString("idNumber", ""))
                            .put("country", current.optString("country", "DO"))
                            .put("language", language));
                } catch (Exception ignored) { }
            });
            dialog.dismiss();
            recreate();
        }).setNegativeButton(tr("Cancelar"), null).show();
    }

    private void showLogin() {
        activeScreen = "Login";
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        LinearLayout page = column();
        page.setGravity(Gravity.CENTER_HORIZONTAL);
        page.setPadding(dp(24), dp(38), dp(24), dp(30));
        page.setBackgroundColor(BG);
        scroll.addView(page);

        ImageView mark = brandImage();
        page.addView(mark, params(dp(96), dp(96), 0));
        page.addView(text("HispaniolaPay", 29, darkMode ? Color.rgb(126, 188, 255) : NAVY, Typeface.BOLD), params(-2, -2, 18));
        TextView slogan = text("Tu billetera entre RD y Haití", 15, MUTED, Typeface.NORMAL);
        slogan.setGravity(Gravity.CENTER);
        page.addView(slogan, params(-1, -2, 5));

        LinearLayout panel = column();
        panel.setPadding(dp(20), dp(22), dp(20), dp(22));
        panel.setBackground(round(SURFACE, 24, LINE, 1));
        page.addView(panel, params(-1, -2, 30));
        panel.addView(text("Accede a tu cuenta", 21, INK, Typeface.BOLD));
        panel.addView(text("Consulta tu saldo y envía remesas en tiempo real.", 13, MUTED, Typeface.NORMAL), params(-1, -2, 5));

        EditText email = input("Correo electrónico", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText password = input("Contraseña", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        panel.addView(email, params(-1, dp(56), 20));
        panel.addView(password, params(-1, dp(56), 12));

        Button login = primaryButton("Iniciar sesión");
        panel.addView(login, params(-1, dp(54), 18));
        TextView divider = text("────────  o continúa con  ────────", 12, MUTED, Typeface.NORMAL);
        divider.setGravity(Gravity.CENTER);
        panel.addView(divider, params(-1, -2, 14));
        Button google = secondaryButton("G   Continuar con Google");
        google.setTextColor(INK);
        panel.addView(google, params(-1, dp(54), 12));
        TextView secure = text("🔒 Acceso protegido con Firebase Authentication", 12, MUTED, Typeface.NORMAL);
        secure.setGravity(Gravity.CENTER);
        panel.addView(secure, params(-1, -2, 14));

        login.setOnClickListener(v -> {
            String mail = email.getText().toString().trim();
            String pass = password.getText().toString();
            if (mail.isEmpty() || pass.length() < 6) { toast("Escribe tu correo y contraseña."); return; }
            login.setEnabled(false);
            login.setText("Conectando…");
            executor.execute(() -> {
                try {
                    api.login(mail, pass);
                    runOnUiThread(() -> loadAccount(true));
                } catch (Exception error) {
                    runOnUiThread(() -> {
                        login.setEnabled(true);
                        login.setText("Iniciar sesión");
                        errorDialog("No pudimos iniciar sesión", friendly(error));
                    });
                }
            });
        });
        google.setOnClickListener(v -> startActivityForResult(googleClient.getSignInIntent(), GOOGLE_SIGN_IN));
        setContentView(scroll);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != GOOGLE_SIGN_IN) return;
        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account.getIdToken();
            if (idToken == null || idToken.isEmpty()) throw new IllegalStateException("Google no devolvió una credencial válida");
            showLoading("Validando tu cuenta de Google…");
            executor.execute(() -> {
                try { api.loginWithGoogle(idToken); runOnUiThread(() -> loadAccount(false)); }
                catch (Exception error) { runOnUiThread(() -> { googleClient.signOut(); showLogin(); errorDialog("No pudimos acceder con Google", friendly(error)); }); }
            });
        } catch (ApiException error) {
            int code = error.getStatusCode();
            String detail;
            if (code == 10) detail = "La firma de esta aplicación no estaba autorizada en Google. Instala la versión actualizada de HispaniolaPay.";
            else if (code == 7) detail = "No se pudo conectar con Google. Revisa tu internet e intenta nuevamente.";
            else if (code == 12501) detail = "La selección de la cuenta fue cancelada.";
            else detail = "Google no pudo iniciar la sesión (código " + code + "). Intenta nuevamente.";
            errorDialog("No se pudo acceder con Google", detail);
        } catch (Exception error) {
            errorDialog("No se pudo acceder con Google", friendly(error));
        }
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        capturePaymentLink(intent);
        if (api != null && api.hasSession() && !pendingRecipient.isEmpty()) {
            String recipient = pendingRecipient;
            pendingRecipient = "";
            showTransfer(recipient);
        } else if (api != null && api.hasSession() && (intent.getBooleanExtra("openNotifications", false) || "OPEN_NOTIFICATIONS".equals(intent.getAction()))) showNotifications();
    }

    private void loadAccount(boolean fullScreen) {
        if (fullScreen) showLoading("Sincronizando tu billetera…");
        executor.execute(() -> {
            try {
                accountData = api.account();
                runOnUiThread(() -> {
                    syncPushToken();
                    if (!getSharedPreferences("hispaniola_ui", MODE_PRIVATE).contains("language")) {
                        String savedLanguage = account().optString("language", "es");
                        if ("es".equals(savedLanguage) || "en".equals(savedLanguage) || "ht".equals(savedLanguage)) language = savedLanguage;
                    }
                    if (!pendingRecipient.isEmpty()) {
                        String recipient = pendingRecipient; pendingRecipient = ""; showTransfer(recipient);
                    } else if (getIntent().getBooleanExtra("openNotifications", false) || "OPEN_NOTIFICATIONS".equals(getIntent().getAction())) {
                        getIntent().removeExtra("openNotifications"); getIntent().setAction(null); showNotifications();
                    } else showHome();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    if (error instanceof ApiClient.ApiException && ((ApiClient.ApiException) error).statusCode == 401) {
                        api.logout(); showLogin();
                    } else {
                        errorDialog("No se pudo cargar la cuenta", friendly(error));
                        if (accountData == null) showLogin();
                    }
                });
            }
        });
    }

    private void showHome() {
        activeScreen = "Inicio";
        JSONObject account = account();
        renderShell("Hola, " + firstName(account.optString("name", "cliente")), "Tu dinero listo para cruzar fronteras");
        balanceCard(walletBalance(account));
        section("Acciones rápidas");
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.addView(actionTile("↗", "Enviar", "NatCash y MonCash", BLUE, v -> showSend()), new LinearLayout.LayoutParams(0, dp(132), 1));
        actions.addView(space(dp(12), 1));
        actions.addView(actionTile("▣", "Billetera", "Saldo e historial", GREEN, v -> showWallet()), new LinearLayout.LayoutParams(0, dp(132), 1));
        content.addView(actions, params(-1, -2, 10));
        content.addView(actionTile("⇄", "Transferir saldo", "Cliente o subagente · comisión 0.30%", GREEN, v -> showTransfer()), params(-1, dp(98), 12));
        content.addView(actionTile("⚡", "Recargas y servicios", "Recargas móviles y pago de facturas", AMBER, v -> showRechargeServices()), params(-1, dp(98), 12));
        content.addView(actionTile("+", "Depositar en billetera", "Cuentas autorizadas · 0% de comisión", CYAN, v -> showDeposit()), params(-1, dp(98), 12));
        View alerts = actionTile("●", "Centro de notificaciones", "Depósitos, remesas y avisos de seguridad", AMBER, v -> showNotifications());
        content.addView(alerts, params(-1, dp(98), 12));
        section("Actividad reciente");
        addRecent(3);
        Button fullHistory = secondaryButton("Ver historial completo");
        fullHistory.setOnClickListener(v -> openHistory());
        content.addView(fullHistory, params(-1, dp(52), 12));
        info("Operaciones protegidas", "Cada envío se valida en el servidor. Ninguna clave del proveedor se guarda en tu teléfono.");
    }

    private void showWallet() {
        activeScreen = "Billetera";
        JSONObject account = account();
        JSONObject rates = rates();
        renderShell("Mi billetera", "Saldos actualizados desde tu cuenta segura");
        balanceCard(walletBalance(account));
        LinearLayout savings = card();
        savings.addView(text("BOLSILLO DE AHORRO", 12, GREEN, Typeface.BOLD));
        savings.addView(text(walletMoney(walletSavings(account)), 27, INK, Typeface.BOLD), params(-1, -2, 8));
        savings.addView(text("Fondos separados de tu saldo para envíos", 13, MUTED, Typeface.NORMAL), params(-1, -2, 4));
        content.addView(savings, params(-1, -2, 12));
        Button deposit = primaryButton("+ Depositar sin comisión");
        deposit.setOnClickListener(v -> showDeposit());
        content.addView(deposit, params(-1, dp(54), 12));
        Button transfer = secondaryButton("⇄ Transferir a cliente o subagente");
        transfer.setOnClickListener(v -> showTransfer());
        content.addView(transfer, params(-1, dp(54), 10));
        double available = walletBalance(account);
        double availableUsd = toUsd(available, walletCurrency(), rates);
        info("Equivalencias", String.format(Locale.US, "US$ %,.2f   ·   RD$ %,.2f DOP   ·   G %,.2f HTG", availableUsd, availableUsd * rates.optDouble("dopPerUsd", 58.5), availableUsd * rates.optDouble("htgPerUsd", 132.2)));
        double benefit = account.optDouble("benefitAccruedDOP", 0);
        double benefitRate = account.optDouble("benefitRatePercent", 0);
        if (benefitRate > 0 || benefit > 0) {
            info("Beneficio acumulado", String.format(Locale.US, "RD$ %,.2f acumulados · Remesas %.2f%% · Servicios según Contabilidad", benefit, benefitRate));
            Button redeem = secondaryButton(benefit > 0 ? "Convertir beneficios en balance" : "Sin beneficios pendientes");
            redeem.setEnabled(benefit > 0);
            redeem.setOnClickListener(v -> new AlertDialog.Builder(this)
                    .setTitle("Canjear beneficios")
                    .setMessage(String.format(Locale.US, "RD$%,.2f serán convertidos a la moneda de tu billetera. El acumulado quedará en cero y el canje aparecerá en el historial.", benefit))
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Canjear ahora", (dialog, which) -> redeemBenefits(redeem))
                    .show());
            content.addView(redeem, params(-1, dp(54), 10));
        }
        if ("agent".equalsIgnoreCase(account.optString("role"))) {
            Button history = secondaryButton("Beneficios por rango de fecha");
            history.setOnClickListener(v -> showBenefitHistory());
            content.addView(history, params(-1, dp(54), 10));
        }
        section("Movimientos y remesas");
        addRecent(20);
        Button fullHistory = secondaryButton("Ver historial completo y facturas");
        fullHistory.setOnClickListener(v -> openHistory());
        content.addView(fullHistory, params(-1, dp(52), 12));
    }

    private void redeemBenefits(Button button) {
        button.setEnabled(false);
        button.setText("Canjeando…");
        executor.execute(() -> {
            try {
                api.redeemBenefits();
                accountData = api.account();
                runOnUiThread(() -> { toast("Beneficios convertidos en balance."); showWallet(); });
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText("Convertir beneficios en balance"); errorDialog("No se pudo completar el canje", friendly(error)); });
            }
        });
    }

    private void showBenefitHistory() {
        LocalDate today = LocalDate.now();
        final String[] from = {today.withDayOfMonth(1).toString()};
        final String[] to = {today.toString()};
        renderShell("Mis beneficios", "Remesas y servicios en un solo historial");
        info("Reglas claras", "El porcentaje de tu perfil aplica solo a remesas. Recargas, paqueticos, PIN y facturas usan el beneficio definido en Contabilidad.");
        LinearLayout dates = new LinearLayout(this); dates.setOrientation(LinearLayout.HORIZONTAL);
        Button fromButton = secondaryButton("Desde\n" + from[0]);
        Button toButton = secondaryButton("Hasta\n" + to[0]);
        dates.addView(fromButton, new LinearLayout.LayoutParams(0, dp(66), 1)); dates.addView(space(dp(10), 1)); dates.addView(toButton, new LinearLayout.LayoutParams(0, dp(66), 1));
        content.addView(dates, params(-1, -2, 12));
        fromButton.setOnClickListener(v -> pickDate(from[0], selected -> { from[0] = selected; fromButton.setText("Desde\n" + selected); }));
        toButton.setOnClickListener(v -> pickDate(to[0], selected -> { to[0] = selected; toButton.setText("Hasta\n" + selected); }));
        Button consult = primaryButton("Consultar beneficios");
        consult.setOnClickListener(v -> loadBenefitHistory(from[0], to[0]));
        content.addView(consult, params(-1, dp(54), 12));
    }

    private interface DateResult { void selected(String value); }
    private void pickDate(String current, DateResult result) {
        LocalDate value;
        try { value = LocalDate.parse(current); } catch (Exception ignored) { value = LocalDate.now(); }
        new DatePickerDialog(this, (view, year, month, day) -> result.selected(LocalDate.of(year, month + 1, day).toString()), value.getYear(), value.getMonthValue() - 1, value.getDayOfMonth()).show();
    }

    private void loadBenefitHistory(String from, String to) {
        showLoading("Consultando tus beneficios…");
        executor.execute(() -> {
            try { JSONObject response = api.benefitHistory(from, to); runOnUiThread(() -> renderBenefitHistory(response, from, to)); }
            catch (Exception error) { runOnUiThread(() -> { showWallet(); errorDialog("No se pudo consultar", friendly(error)); }); }
        });
    }

    private void renderBenefitHistory(JSONObject response, String from, String to) {
        renderShell("Mis beneficios", from + "  →  " + to);
        JSONObject summary = response.optJSONObject("summary"); if (summary == null) summary = new JSONObject();
        LinearLayout totals = card();
        totals.addView(text(String.format(Locale.US, "RD$%,.2f", summary.optDouble("generatedDOP")), 29, GREEN, Typeface.BOLD));
        totals.addView(text(String.format(Locale.US, "Remesas RD$%,.2f  ·  Servicios RD$%,.2f", summary.optDouble("remittanceDOP"), summary.optDouble("servicesDOP")), 12, MUTED, Typeface.BOLD), params(-1, -2, 6));
        totals.addView(text(String.format(Locale.US, "Canjeado en el rango RD$%,.2f", summary.optDouble("redeemedDOP")), 12, AMBER, Typeface.BOLD), params(-1, -2, 5));
        content.addView(totals);
        Button changeRange = secondaryButton("Consultar otro rango"); changeRange.setOnClickListener(v -> showBenefitHistory());
        content.addView(changeRange, params(-1, dp(52), 10));
        JSONArray items = response.optJSONArray("items"); section("Detalle generado");
        if (items == null || items.length() == 0) { info("Sin beneficios", "No hay beneficios generados en el rango seleccionado."); return; }
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i); if (item == null) continue;
            LinearLayout row = card(); LinearLayout top = new LinearLayout(this); top.setGravity(Gravity.CENTER_VERTICAL);
            top.addView(text(item.optString("sourceLabel", "Beneficio"), 14, INK, Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1));
            top.addView(text(String.format(Locale.US, "+RD$%,.2f", item.optDouble("amountDOP")), 14, GREEN, Typeface.BOLD)); row.addView(top);
            row.addView(text(item.optString("description", "") + " · " + item.optString("createdAt", "").replace('T', ' '), 11, MUTED, Typeface.NORMAL), params(-1, -2, 5));
            content.addView(row, params(-1, -2, 8));
        }
    }

    private void showRechargeServices() {
        activeScreen = "Servicios";
        renderShell("Recargas y servicios", "Consultando el catálogo disponible");
        LinearLayout loadingCard = card(); loadingCard.setGravity(Gravity.CENTER);
        ProgressBar loading = new ProgressBar(this); loadingCard.addView(loading, new LinearLayout.LayoutParams(dp(34), dp(34)));
        TextView loadingText = text("Actualizando servicios…", 13, MUTED, Typeface.BOLD); loadingText.setGravity(Gravity.CENTER); loadingCard.addView(loadingText, params(-1, -2, 8));
        content.addView(loadingCard, params(-1, -2, 12));
        executor.execute(() -> {
            try {
                JSONObject response = api.rechargeProducts();
                runOnUiThread(() -> renderRechargeServices(response));
            } catch (Exception error) {
                runOnUiThread(() -> {
                    renderShell("Recargas y servicios", "Usa el mismo balance de tu billetera");
                    errorDialog("Servicio no disponible", friendly(error));
                });
            }
        });
    }

    private void renderRechargeServices(JSONObject response) {
        activeScreen = "Servicios";
        JSONArray source = response.optJSONArray("products");
        JSONArray mobileProducts = new JSONArray();
        JSONArray serviceProducts = new JSONArray();
        JSONArray dataPlanProducts = new JSONArray();
        JSONArray pinProducts = new JSONArray();
        JSONArray invoiceProducts = new JSONArray();
        if (source != null) {
            for (int i = 0; i < source.length(); i++) {
                JSONObject product = source.optJSONObject(i);
                if (product == null) continue;
                boolean enabled = product.optBoolean("enabled", true);
                String category = product.optString("category");
                String type = product.optString("type");
                if (enabled && ("mobile-topup".equals(category) || (category.isEmpty() && "Recarga".equalsIgnoreCase(type)))) mobileProducts.put(product);
                if (enabled && ("energy-topup".equals(category) || "other".equals(category) || "Recarga de servicio".equalsIgnoreCase(type))) serviceProducts.put(product);
                if (enabled && ("data-plan".equals(category) || "Paquetico".equalsIgnoreCase(type))) dataPlanProducts.put(product);
                if (enabled && ("pin".equals(category) || "Pin".equalsIgnoreCase(type))) pinProducts.put(product);
                if (isInvoiceProduct(product)) invoiceProducts.put(product);
            }
        }
        double feePercent = response.optDouble("feePercent", 0);
        renderShell("Recargas y servicios", "Una sola billetera para todas tus operaciones");
        balanceCard(walletBalance(account()));
        info("Balance único", "Las recargas, facturas y remesas utilizan el mismo saldo disponible. La separación operativa se gestiona únicamente en administración.");
        section("Selecciona un servicio");
        content.addView(actionTile("⚡", "Recarga móvil", "Claro, Altice, Viva y productos disponibles", AMBER,
                v -> showMobileTopup(mobileProducts, feePercent)), params(-1, dp(112), 10));
        content.addView(actionTile("⌁", "Recarga de servicios", "Energía prepago, peajes, TV e internet", BLUE,
                v -> showServiceTopup(serviceProducts, feePercent)), params(-1, dp(112), 10));
        content.addView(actionTile("📶", "Paqueticos", "Data, minutos y redes sociales", GREEN,
                v -> showDataPlans(dataPlanProducts, feePercent)), params(-1, dp(112), 10));
        content.addView(actionTile("🔑", "Comprar PIN", "Pines electrónicos disponibles al instante", PURPLE,
                v -> showPinPurchase(pinProducts, feePercent)), params(-1, dp(112), 10));
        content.addView(actionTile("▤", "Pagar factura", "Consulta el contrato antes de confirmar", BLUE,
                v -> showInvoicePayment(invoiceProducts, feePercent)), params(-1, dp(112), 10));
        content.addView(actionTile("↶", "Historial y anulaciones", "Cancela recargas o facturas dentro del plazo permitido", RED,
                v -> showRechargeCancellationHistory()), params(-1, dp(112), 10));
        if (mobileProducts.length() == 0 && serviceProducts.length() == 0 && dataPlanProducts.length() == 0 && pinProducts.length() == 0 && invoiceProducts.length() == 0) {
            info("Sin productos", "El proveedor no devolvió productos disponibles en este momento.");
        }
    }

    private void showDataPlans(JSONArray products, double feePercent) {
        activeScreen = "Servicios";
        renderShell("Paqueticos", "Activa data, minutos y redes sociales");
        balanceCard(walletBalance(account()));
        final int[] selectedProduct = {-1};
        final int[] selectedPlan = {-1};
        final JSONArray[] availablePlans = {new JSONArray()};
        Button productButton = secondaryButton("Seleccionar compañía");
        content.addView(productButton, params(-1, dp(54), 14));
        EditText phone = input("Número de teléfono", InputType.TYPE_CLASS_PHONE);
        content.addView(phone, params(-1, dp(56), 12));
        Button lookup = secondaryButton("Consultar paqueticos disponibles");
        content.addView(lookup, params(-1, dp(54), 12));
        Button planButton = secondaryButton("Seleccionar paquetico");
        planButton.setEnabled(false);
        content.addView(planButton, params(-1, dp(54), 12));
        TextView total = text("Selecciona un paquetico para ver el total.", 14, INK, Typeface.BOLD);
        content.addView(total, params(-1, -2, 14));
        Button submit = primaryButton("Activar paquetico");
        submit.setEnabled(false);

        Runnable resetPlans = () -> {
            selectedPlan[0] = -1;
            availablePlans[0] = new JSONArray();
            planButton.setText("Seleccionar paquetico");
            planButton.setEnabled(false);
            submit.setEnabled(false);
            total.setText("Consulta los planes disponibles para este número.");
        };
        productButton.setOnClickListener(v -> chooseProduct(products, selectedProduct, productButton, product -> resetPlans.run()));
        phone.addTextChangedListener(new SimpleWatcher() { @Override public void afterTextChanged(Editable editable) { resetPlans.run(); } });
        lookup.setOnClickListener(v -> {
            JSONObject product = selectedProduct[0] >= 0 ? products.optJSONObject(selectedProduct[0]) : null;
            String cleanPhone = phone.getText().toString().replaceAll("\\D", "");
            if (product == null || cleanPhone.length() < 10) { errorDialog("Datos incompletos", "Selecciona la compañía e indica un teléfono válido."); return; }
            lookup.setEnabled(false); lookup.setText("Consultando…");
            executor.execute(() -> {
                try {
                    JSONObject response = api.lookupDataPlans(product.optInt("id"), cleanPhone);
                    JSONArray found = response.optJSONArray("plans");
                    if (found == null) found = new JSONArray();
                    JSONArray finalFound = found;
                    runOnUiThread(() -> {
                        lookup.setEnabled(true); lookup.setText("Consultar paqueticos disponibles");
                        availablePlans[0] = finalFound;
                        planButton.setEnabled(finalFound.length() > 0);
                        if (finalFound.length() == 0) errorDialog("Sin paqueticos", "El proveedor no devolvió planes disponibles para este número.");
                        else toast(finalFound.length() + " paqueticos disponibles");
                    });
                } catch (Exception error) {
                    runOnUiThread(() -> { lookup.setEnabled(true); lookup.setText("Consultar paqueticos disponibles"); errorDialog("No se cargaron los paqueticos", friendly(error)); });
                }
            });
        });
        planButton.setOnClickListener(v -> choosePlan(availablePlans[0], selectedPlan, planButton, plan -> {
            double value = plan.optDouble("price", 0);
            double finalTotal = round(value + value * feePercent / 100d);
            total.setText(String.format(Locale.US, "%s\nPrecio RD$%,.2f · Tarifa %.2f%% · Total RD$%,.2f", plan.optString("name", "Paquetico"), value, feePercent, finalTotal));
            submit.setEnabled(value > 0);
        }));
        submit.setOnClickListener(v -> {
            JSONObject product = selectedProduct[0] >= 0 ? products.optJSONObject(selectedProduct[0]) : null;
            JSONObject plan = selectedPlan[0] >= 0 ? availablePlans[0].optJSONObject(selectedPlan[0]) : null;
            String cleanPhone = phone.getText().toString().replaceAll("\\D", "");
            if (product == null || plan == null) return;
            new AlertDialog.Builder(this).setTitle("Confirmar paquetico")
                    .setMessage(product.optString("name") + "\n" + plan.optString("name") + "\nTeléfono: " + cleanPhone + "\n" + total.getText())
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Activar ahora", (dialog, which) -> executeServiceRecharge(submit,
                            jsonPayload("action", "data_plan", "productId", product.optInt("id"), "phone", cleanPhone, "planId", String.valueOf(plan.opt("id")), "idempotencyKey", UUID.randomUUID().toString()), "Paquetico activado"))
                    .show();
        });
        content.addView(submit, params(-1, dp(56), 12));
    }

    private void showMobileTopup(JSONArray products, double feePercent) {
        activeScreen = "Servicios";
        renderShell("Recarga móvil", "Débito seguro desde tu balance único");
        balanceCard(walletBalance(account()));
        final int[] selected = {-1};
        Button productButton = secondaryButton("Seleccionar compañía o producto");
        content.addView(productButton, params(-1, dp(54), 14));
        TextView limits = text("Selecciona el producto para consultar los límites.", 12, MUTED, Typeface.NORMAL);
        content.addView(limits, params(-1, -2, 6));
        EditText phone = input("Número de teléfono", InputType.TYPE_CLASS_PHONE);
        content.addView(phone, params(-1, dp(56), 12));
        EditText amount = input("Monto en pesos dominicanos", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        content.addView(amount, params(-1, dp(56), 10));
        TextView total = text("Total: RD$0.00", 16, INK, Typeface.BOLD);
        content.addView(total, params(-1, -2, 14));
        TextWatcher amountWatcher = new SimpleWatcher() {
            @Override public void afterTextChanged(Editable editable) {
                double value = parseAmount(editable.toString());
                total.setText(String.format(Locale.US, "Recarga RD$%,.2f  ·  Tarifa %.2f%%  ·  Total RD$%,.2f", value, feePercent, value + value * feePercent / 100d));
            }
        };
        amount.addTextChangedListener(amountWatcher);
        productButton.setOnClickListener(v -> chooseProduct(products, selected, productButton, product ->
                limits.setText(String.format(Locale.US, "Monto permitido: RD$%,.2f – RD$%,.2f", product.optDouble("min", 0), product.optDouble("max", 0)))));
        Button submit = primaryButton("Confirmar recarga");
        submit.setOnClickListener(v -> {
            JSONObject product = selected[0] >= 0 ? products.optJSONObject(selected[0]) : null;
            double value = parseAmount(amount.getText().toString());
            String cleanPhone = phone.getText().toString().replaceAll("\\D", "");
            if (product == null) { errorDialog("Selecciona un producto", "Elige la compañía antes de continuar."); return; }
            if (cleanPhone.length() < 10 || value <= 0) { errorDialog("Datos incompletos", "Indica un teléfono y un monto válidos."); return; }
            double finalTotal = round(value + value * feePercent / 100d);
            new AlertDialog.Builder(this).setTitle("Confirmar recarga")
                    .setMessage(product.optString("name") + "\nTeléfono: " + cleanPhone + "\nRecarga: RD$" + String.format(Locale.US, "%,.2f", value) + "\nTotal: RD$" + String.format(Locale.US, "%,.2f", finalTotal))
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Recargar ahora", (dialog, which) -> executeServiceRecharge(submit,
                            jsonPayload("action", "mobile_topup", "productId", product.optInt("id"), "phone", cleanPhone, "amount", value, "idempotencyKey", UUID.randomUUID().toString()), "Recarga completada"))
                    .show();
        });
        content.addView(submit, params(-1, dp(56), 18));
    }

    private void showServiceTopup(JSONArray products, double feePercent) {
        activeScreen = "Servicios";
        renderShell("Recarga de servicios", "Energía prepago, peajes, TV e internet");
        balanceCard(walletBalance(account()));
        final int[] selected = {-1};
        Button productButton = secondaryButton("Seleccionar proveedor de servicio");
        content.addView(productButton, params(-1, dp(54), 14));
        TextView limits = text("Selecciona el proveedor para consultar los límites.", 12, MUTED, Typeface.NORMAL);
        content.addView(limits, params(-1, -2, 6));
        EditText number = input("Número, contrato o referencia", InputType.TYPE_CLASS_TEXT);
        content.addView(number, params(-1, dp(56), 12));
        EditText amount = input("Monto en pesos dominicanos", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        content.addView(amount, params(-1, dp(56), 10));
        TextView total = text("Total: RD$0.00", 16, INK, Typeface.BOLD);
        content.addView(total, params(-1, -2, 14));
        amount.addTextChangedListener(new SimpleWatcher() {
            @Override public void afterTextChanged(Editable editable) {
                double value = parseAmount(editable.toString());
                double finalTotal = round(value + value * feePercent / 100d);
                total.setText(String.format(Locale.US, "Servicio RD$%,.2f  ·  Tarifa %.2f%%  ·  Total RD$%,.2f", value, feePercent, finalTotal));
            }
        });
        productButton.setOnClickListener(v -> chooseProduct(products, selected, productButton, product ->
                limits.setText(String.format(Locale.US, "Monto permitido: RD$%,.2f – RD$%,.2f", product.optDouble("min", 0), product.optDouble("max", 0)))));
        Button submit = primaryButton("Confirmar recarga de servicio");
        submit.setOnClickListener(v -> {
            JSONObject product = selected[0] >= 0 ? products.optJSONObject(selected[0]) : null;
            String reference = number.getText().toString().trim();
            double value = parseAmount(amount.getText().toString());
            if (product == null) { errorDialog("Selecciona un proveedor", "Elige el servicio antes de continuar."); return; }
            if (reference.isEmpty() || value <= 0) { errorDialog("Datos incompletos", "Indica el número del servicio y un monto válido."); return; }
            double minimum = product.optDouble("min", 0);
            double maximum = product.optDouble("max", Double.MAX_VALUE);
            if (value < minimum || value > maximum) { errorDialog("Monto no permitido", limits.getText().toString()); return; }
            double finalTotal = round(value + value * feePercent / 100d);
            new AlertDialog.Builder(this).setTitle("Confirmar recarga de servicio")
                    .setMessage(product.optString("name") + "\nNúmero: " + reference + "\nMonto: RD$" + String.format(Locale.US, "%,.2f", value) + "\nTotal: RD$" + String.format(Locale.US, "%,.2f", finalTotal))
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Recargar ahora", (dialog, which) -> executeServiceRecharge(submit,
                            jsonPayload("action", "service_topup", "productId", product.optInt("id"), "number", reference, "amount", value, "idempotencyKey", UUID.randomUUID().toString()), "Servicio recargado"))
                    .show();
        });
        content.addView(submit, params(-1, dp(56), 18));
    }

    private void showPinPurchase(JSONArray products, double feePercent) {
        activeScreen = "Servicios";
        renderShell("Comprar PIN", "Recibe el código electrónico inmediatamente");
        balanceCard(walletBalance(account()));
        final int[] selected = {-1};
        Button productButton = secondaryButton("Seleccionar proveedor de PIN");
        content.addView(productButton, params(-1, dp(54), 14));
        TextView limits = text("Selecciona un producto para consultar el precio permitido.", 12, MUTED, Typeface.NORMAL);
        content.addView(limits, params(-1, -2, 6));
        EditText price = input("Precio del PIN en pesos dominicanos", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        content.addView(price, params(-1, dp(56), 12));
        TextView total = text("Total: RD$0.00", 16, INK, Typeface.BOLD);
        content.addView(total, params(-1, -2, 14));
        price.addTextChangedListener(new SimpleWatcher() {
            @Override public void afterTextChanged(Editable editable) {
                double value = parseAmount(editable.toString());
                double finalTotal = round(value + value * feePercent / 100d);
                total.setText(String.format(Locale.US, "PIN RD$%,.2f  ·  Tarifa %.2f%%  ·  Total RD$%,.2f", value, feePercent, finalTotal));
            }
        });
        productButton.setOnClickListener(v -> chooseProduct(products, selected, productButton, product -> {
            double minimum = product.optDouble("min", 0);
            double maximum = product.optDouble("max", 0);
            limits.setText(maximum > 0
                    ? String.format(Locale.US, "Precio permitido: RD$%,.2f – RD$%,.2f", minimum, maximum)
                    : String.format(Locale.US, "Precio mínimo: RD$%,.2f", minimum));
        }));
        Button submit = primaryButton("Comprar PIN");
        submit.setOnClickListener(v -> {
            JSONObject product = selected[0] >= 0 ? products.optJSONObject(selected[0]) : null;
            double value = parseAmount(price.getText().toString());
            if (product == null) { errorDialog("Selecciona un producto", "Elige el proveedor del PIN antes de continuar."); return; }
            double minimum = product.optDouble("min", 0);
            double maximum = product.optDouble("max", Double.MAX_VALUE);
            if (value <= 0 || value < minimum || value > maximum) { errorDialog("Precio no permitido", limits.getText().toString()); return; }
            double finalTotal = round(value + value * feePercent / 100d);
            new AlertDialog.Builder(this).setTitle("Confirmar compra de PIN")
                    .setMessage(product.optString("name") + "\nPrecio: RD$" + String.format(Locale.US, "%,.2f", value) + "\nTotal: RD$" + String.format(Locale.US, "%,.2f", finalTotal))
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Comprar ahora", (dialog, which) -> executeServiceRecharge(submit,
                            jsonPayload("action", "pin_purchase", "productId", product.optInt("id"), "price", value, "idempotencyKey", UUID.randomUUID().toString()), "PIN comprado"))
                    .show();
        });
        content.addView(submit, params(-1, dp(56), 18));
    }

    private void showInvoicePayment(JSONArray products, double feePercent) {
        activeScreen = "Servicios";
        renderShell("Pagar factura", "Consulta primero el contrato o NIC");
        balanceCard(walletBalance(account()));
        final int[] selected = {-1};
        final JSONObject[] invoice = {null};
        Button productButton = secondaryButton("Seleccionar empresa de servicio");
        content.addView(productButton, params(-1, dp(54), 14));
        EditText nic = input("Contrato, NIC o referencia", InputType.TYPE_CLASS_TEXT);
        content.addView(nic, params(-1, dp(56), 12));
        TextView invoiceInfo = text("", 14, INK, Typeface.BOLD);
        invoiceInfo.setVisibility(View.GONE);
        content.addView(invoiceInfo, params(-1, -2, 14));
        Button pay = primaryButton("Pagar factura");
        pay.setEnabled(false);
        productButton.setOnClickListener(v -> chooseProduct(products, selected, productButton, product -> { invoice[0] = null; invoiceInfo.setVisibility(View.GONE); pay.setEnabled(false); }));
        Button lookup = secondaryButton("Consultar factura");
        lookup.setOnClickListener(v -> {
            JSONObject product = selected[0] >= 0 ? products.optJSONObject(selected[0]) : null;
            String contract = nic.getText().toString().trim();
            if (product == null || contract.isEmpty()) { errorDialog("Datos incompletos", "Selecciona la empresa e indica el contrato o NIC."); return; }
            lookup.setEnabled(false); lookup.setText("Consultando…");
            executor.execute(() -> {
                try {
                    JSONObject response = api.lookupServiceInvoice(product.optInt("id"), contract);
                    JSONObject found = response.optJSONObject("invoice");
                    runOnUiThread(() -> {
                        lookup.setEnabled(true); lookup.setText("Consultar factura"); invoice[0] = found;
                        if (found == null) { errorDialog("Factura no encontrada", "El proveedor no devolvió información de la factura."); return; }
                        double value = found.optDouble("amount", 0);
                        double finalTotal = round(value + value * feePercent / 100d);
                        invoiceInfo.setText(String.format(Locale.US, "%s\nContrato: %s\nFactura: RD$%,.2f · Tarifa %.2f%% · Total RD$%,.2f", found.optString("name", "Titular"), found.optString("nic", contract), value, feePercent, finalTotal));
                        invoiceInfo.setVisibility(View.VISIBLE); pay.setEnabled(value > 0);
                    });
                } catch (Exception error) {
                    runOnUiThread(() -> { lookup.setEnabled(true); lookup.setText("Consultar factura"); errorDialog("Factura no encontrada", friendly(error)); });
                }
            });
        });
        content.addView(lookup, params(-1, dp(54), 12));
        pay.setOnClickListener(v -> {
            JSONObject product = selected[0] >= 0 ? products.optJSONObject(selected[0]) : null;
            if (product == null || invoice[0] == null) return;
            new AlertDialog.Builder(this).setTitle("Confirmar pago")
                    .setMessage(invoiceInfo.getText())
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Pagar ahora", (dialog, which) -> executeServiceRecharge(pay,
                            jsonPayload("action", "invoice_payment", "productId", product.optInt("id"), "nic", nic.getText().toString().trim(), "idempotencyKey", UUID.randomUUID().toString()), "Factura pagada"))
                    .show();
        });
        content.addView(pay, params(-1, dp(56), 12));
    }

    private void showRechargeCancellationHistory() {
        activeScreen = "Servicios";
        renderShell("Historial y anulaciones", "Recargas y pagos de facturas recientes");
        LinearLayout loadingCard = card(); loadingCard.setGravity(Gravity.CENTER);
        ProgressBar progress = new ProgressBar(this); loadingCard.addView(progress, new LinearLayout.LayoutParams(dp(34), dp(34)));
        TextView label = text("Consultando operaciones…", 13, MUTED, Typeface.BOLD); label.setGravity(Gravity.CENTER); loadingCard.addView(label, params(-1, -2, 8));
        content.addView(loadingCard);
        executor.execute(() -> {
            try { JSONObject response = api.rechargeHistory(); runOnUiThread(() -> renderRechargeCancellationHistory(response)); }
            catch (Exception error) { runOnUiThread(() -> { showRechargeServices(); errorDialog("No se cargó el historial", friendly(error)); }); }
        });
    }

    private void renderRechargeCancellationHistory(JSONObject response) {
        renderShell("Historial y anulaciones", "El proveedor valida cada solicitud en tiempo real");
        info("Anulación protegida", "Solo las recargas y pagos de facturas muestran la opción. Si el plazo expiró, el proveedor rechazará la solicitud y no se modificará tu balance.");
        JSONArray transactions = response.optJSONArray("transactions");
        if (transactions == null || transactions.length() == 0) { info("Sin operaciones", "Todavía no tienes recargas o pagos de facturas registrados."); return; }
        for (int i = 0; i < transactions.length(); i++) {
            JSONObject item = transactions.optJSONObject(i); if (item == null) continue;
            String status = item.optString("status", "processing");
            boolean cancelled = "cancelled".equals(status);
            LinearLayout panel = card();
            LinearLayout top = new LinearLayout(this); top.setGravity(Gravity.CENTER_VERTICAL);
            top.addView(text(item.optString("title", "Servicio") + " · " + item.optString("productName", ""), 14, INK, Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1));
            top.addView(text(cancelled ? "ANULADA" : "completed".equals(status) ? "COMPLETADA" : "cancellation_review".equals(status) ? "EN REVISIÓN" : status.toUpperCase(Locale.ROOT), 10, cancelled ? MUTED : "completed".equals(status) ? GREEN : AMBER, Typeface.BOLD));
            panel.addView(top);
            panel.addView(text(item.optString("target", "") + " · Ref. " + item.optString("providerId", "—"), 11, MUTED, Typeface.NORMAL), params(-1, -2, 6));
            panel.addView(text(String.format(Locale.US, "RD$%,.2f", item.optDouble("totalDOP", item.optDouble("amountDOP"))), 19, INK, Typeface.BOLD), params(-1, -2, 7));
            String cancellationError = item.optString("cancellationError", "");
            if (!cancellationError.isEmpty()) panel.addView(text(cancellationError, 11, AMBER, Typeface.NORMAL), params(-1, -2, 6));
            if (item.optBoolean("canCancel", false)) {
                Button cancel = new Button(this); cancel.setAllCaps(false); cancel.setText("Solicitar anulación"); cancel.setTextColor(Color.WHITE); cancel.setTypeface(Typeface.DEFAULT, Typeface.BOLD); cancel.setBackground(round(RED, 14, Color.TRANSPARENT, 0));
                cancel.setOnClickListener(v -> new AlertDialog.Builder(this)
                        .setTitle("Confirmar solicitud")
                        .setMessage("El proveedor verificará si esta operación todavía está dentro del plazo de anulación. El saldo solo se devolverá cuando confirme la cancelación.")
                        .setNegativeButton("Volver", null)
                        .setPositiveButton("Solicitar anulación", (dialog, which) -> cancelRecharge(item.optString("id"), cancel))
                        .show());
                panel.addView(cancel, params(-1, dp(50), 10));
            }
            content.addView(panel, params(-1, -2, i == 0 ? 0 : 9));
        }
    }

    private void cancelRecharge(String transactionId, Button button) {
        button.setEnabled(false); button.setText("Solicitando…");
        executor.execute(() -> {
            try {
                JSONObject result = api.cancelRecharge(transactionId);
                accountData = api.account();
                runOnUiThread(() -> { toast(result.optBoolean("duplicate", false) ? "La operación ya estaba anulada." : "Operación anulada. Saldo devuelto."); showRechargeCancellationHistory(); });
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText("Solicitar anulación"); errorDialog("No se pudo anular", friendly(error)); });
            }
        });
    }

    private interface ProductSelection { void selected(JSONObject product); }

    private void chooseProduct(JSONArray products, int[] selected, Button button, ProductSelection callback) {
        if (products.length() == 0) { errorDialog("Sin productos", "No hay productos disponibles para este servicio."); return; }
        LinearLayout list = new LinearLayout(this); list.setOrientation(LinearLayout.VERTICAL); list.setPadding(dp(12), dp(8), dp(12), dp(8));
        ScrollView scroll = new ScrollView(this); scroll.addView(list);
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Seleccionar proveedor").setView(scroll).setNegativeButton("Cancelar", null).create();
        for (int i = 0; i < products.length(); i++) {
            int index = i; JSONObject product = products.optJSONObject(i);
            LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL); row.setGravity(Gravity.CENTER_VERTICAL); row.setPadding(dp(12), dp(10), dp(12), dp(10)); row.setBackground(round(SURFACE_ALT, 14, LINE, 1));
            boolean enabled = product.optBoolean("enabled", true);
            ImageView logo = new ImageView(this); logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE); logo.setPadding(dp(7), dp(7), dp(7), dp(7)); logo.setBackground(round(Color.WHITE, 28, LINE, 1)); row.addView(logo, new LinearLayout.LayoutParams(dp(56), dp(56)));
            TextView label = text(product.optString("name", "Producto " + (i + 1)), 16, INK, Typeface.BOLD); LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(0, -2, 1); labelParams.setMargins(dp(12), 0, 0, 0); row.addView(label, labelParams);
            if (!enabled) { TextView unavailable = text("Pendiente de activación", 10, AMBER, Typeface.BOLD); row.addView(unavailable); row.setAlpha(.62f); }
            LinearLayout.LayoutParams rowParams = new LinearLayout.LayoutParams(-1, dp(72)); rowParams.setMargins(0, dp(4), 0, dp(4)); list.addView(row, rowParams);
            loadProviderLogo(logo, product);
            row.setOnClickListener(v -> { if (!enabled) { toast("Este servicio debe ser habilitado por el proveedor."); return; } selected[0] = index; button.setText(product.optString("name", "Producto")); callback.selected(product); dialog.dismiss(); });
        }
        dialog.show();
    }

    private interface PlanSelection { void selected(JSONObject plan); }

    private void choosePlan(JSONArray plans, int[] selected, Button button, PlanSelection callback) {
        if (plans.length() == 0) { errorDialog("Sin paqueticos", "Consulta primero los planes disponibles."); return; }
        String[] labels = new String[plans.length()];
        for (int i = 0; i < plans.length(); i++) { JSONObject plan = plans.optJSONObject(i); labels[i] = plan.optString("name", "Paquetico") + " · RD$" + String.format(Locale.US, "%,.2f", plan.optDouble("price", 0)); }
        new AlertDialog.Builder(this).setTitle("Seleccionar paquetico").setSingleChoiceItems(labels, selected[0], (dialog, which) -> {
            selected[0] = which; JSONObject plan = plans.optJSONObject(which); button.setText(labels[which]); callback.selected(plan); dialog.dismiss();
        }).setNegativeButton("Cancelar", null).show();
    }

    private void loadProviderLogo(ImageView target, JSONObject product) {
        String file = "";
        String providerName = product.optString("name");
        String suppliedImage = product.optString("image").trim();
        String normalizedProvider = normalizeProductName(providerName);
        if (normalizedProvider.contains("paso rapido")) normalizedProvider = "paso rapido";
        else if (normalizedProvider.contains("seguro de ley")) normalizedProvider = "seguro de ley";
        else {
            String[] knownProviders = {"midas seguros", "juancito sport", "star sport", "paso rapido", "pgr multas", "coraavega", "coraplata", "coraaplata", "corasan", "coraasan", "coaarom", "edenorte", "edesur", "edeeste", "digicel", "natcom", "altice", "claro", "viva", "moun", "wind", "cepm", "ceb", "adn", "caasd", "dgii", "tss", "activa", "midas"};
            for (String known : knownProviders) if (normalizedProvider.contains(known)) { normalizedProvider = known; break; }
        }
        switch (normalizedProvider) {
            case "claro": file = "claro.svg"; break; case "altice": file = "altice.svg"; break; case "viva": file = "viva.svg"; break;
            case "digicel": file = "digicel.svg"; break; case "moun": file = "moun.svg"; break; case "natcom": file = "natcom.svg"; break;
            case "wind": file = "wind.png"; break; case "edenorte": file = "edenorte.png"; break; case "edesur": file = "edesur.png"; break;
            case "edeeste": file = "edeeste.png"; break; case "cepm": file = "cepm.png"; break; case "ceb": file = "ceb.png"; break;
            case "adn": file = "adn.png"; break; case "caasd": file = "caasd.png"; break; case "corasan": case "coraasan": file = "coraasan.jpg"; break;
            case "coraplata": case "coraaplata": file = "coraaplata.png"; break; case "coaarom": file = "coaarom.png"; break;
            case "dgii": file = "dgii.png"; break; case "midas": case "midas seguros": file = "midas.png"; break;
            case "paso rapido": file = "paso-rapido.png"; break; case "activa": file = "activa.png"; break;
            case "star sport": file = "star-sport.png"; break; case "juancito sport": file = "juancito-sport.png"; break;
            default: if (suppliedImage.isEmpty()) return;
        }
        String suppliedFile = suppliedImage.substring(suppliedImage.lastIndexOf('/') + 1).replaceAll("[?#].*$", "");
        final String imageUrl = !file.isEmpty()
                ? "https://www.recargasdominicanas.do/images/" + file
                : suppliedImage.startsWith("https://") ? suppliedImage : "https://www.recargasdominicanas.do/images/" + suppliedFile;
        imageExecutor.execute(() -> {
            try {
                HttpURLConnection connection = (HttpURLConnection) new URL(imageUrl).openConnection();
                connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
                try (InputStream stream = connection.getInputStream()) {
                    Bitmap bitmap;
                    if (imageUrl.toLowerCase(Locale.ROOT).endsWith(".svg")) {
                        SVG svg = SVG.getFromInputStream(stream);
                        bitmap = Bitmap.createBitmap(dp(52), dp(52), Bitmap.Config.ARGB_8888);
                        Canvas canvas = new Canvas(bitmap);
                        svg.setDocumentWidth(dp(52)); svg.setDocumentHeight(dp(52));
                        svg.renderToCanvas(canvas);
                    } else {
                        bitmap = BitmapFactory.decodeStream(stream);
                    }
                    if (bitmap != null) runOnUiThread(() -> target.setImageBitmap(bitmap));
                } finally { connection.disconnect(); }
            } catch (Exception ignored) { }
        });
    }

    private void executeServiceRecharge(Button button, JSONObject payload, String successTitle) {
        button.setEnabled(false); String original = button.getText().toString(); button.setText("Procesando…");
        executor.execute(() -> {
            try {
                JSONObject response = api.submitRecharge(payload);
                JSONObject transaction = response.optJSONObject("transaction");
                accountData = api.account();
                runOnUiThread(() -> {
                    String pin = transaction == null ? "" : transaction.optString("pin", transaction.optString("issuedPin", ""));
                    String successMessage = "Referencia: " + (transaction == null ? "HispaniolaPay" : transaction.optString("providerId", transaction.optString("id")))
                            + (pin.isEmpty() ? "" : "\n\nPIN: " + pin)
                            + "\nLa operación aparece en tu historial.";
                    AlertDialog.Builder completed = new AlertDialog.Builder(this).setTitle(successTitle)
                            .setMessage(successMessage)
                            .setPositiveButton("Entendido", (dialog, which) -> showRechargeServices());
                    if (receiptEnabled() && transaction != null) completed.setNeutralButton("Recibo " + receiptPaperWidthMm() + " mm", (dialog, which) -> receiptManager.showActions(transaction, accountData));
                    completed.show();
                });
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText(original); errorDialog("No se completó la operación", friendly(error)); });
            }
        });
    }

    private JSONObject jsonPayload(Object... values) {
        JSONObject payload = new JSONObject();
        try {
            for (int i = 0; i + 1 < values.length; i += 2) payload.put(String.valueOf(values[i]), values[i + 1]);
        } catch (Exception error) {
            throw new IllegalStateException("No se pudo preparar la operación", error);
        }
        return payload;
    }

    private void showDeposit() {
        activeScreen = "Depositar";
        showLoading("Cargando cuentas autorizadas…");
        executor.execute(() -> {
            try {
                JSONObject response = api.deposits();
                runOnUiThread(() -> renderDeposit(response));
            } catch (Exception error) {
                runOnUiThread(() -> { showWallet(); errorDialog("No se pudieron cargar los métodos", friendly(error)); });
            }
        });
    }

    private void renderDeposit(JSONObject response) {
        renderShell("Depositar en billetera", "Cuentas autorizadas · comisión 0%");
        info("Sin cargos", "El 100% del valor validado se acredita a tu billetera y queda disponible para enviar remesas.");
        JSONArray methods = response.optJSONArray("methods");
        if (methods == null || methods.length() == 0) {
            info("Métodos no disponibles", "La administración aún no ha publicado cuentas autorizadas.");
            return;
        }
        final JSONObject[] selected = {null};
        section("Elige dónde depositar");
        LinearLayout methodList = column();
        TextView accountInfo = text("", 13, INK, Typeface.NORMAL);
        accountInfo.setTextIsSelectable(true);
        EditText amount = input("Monto depositado", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        EditText reference = input("Referencia / comprobante", InputType.TYPE_CLASS_TEXT);
        TextView creditPreview = text("Acreditación: US$0.00 · Comisión: US$0.00", 13, GREEN, Typeface.BOLD);
        double dopPerUsd = response.optDouble("dopPerUsd", 58.5);
        for (int i = 0; i < methods.length(); i++) {
            JSONObject method = methods.optJSONObject(i);
            if (method == null) continue;
            boolean enabled = method.optBoolean("enabled", true);
            Button option = secondaryButton(method.optString("label") + " · " + method.optString("currency", "USD"));
            option.setEnabled(enabled);
            if (!enabled) option.setText(method.optString("label") + " · Pendiente de configurar");
            if (selected[0] == null && enabled) selected[0] = method;
            option.setOnClickListener(v -> {
                selected[0] = method;
                accountInfo.setText(depositMethodDetails(method));
                amount.setHint("Monto depositado en " + method.optString("currency", "USD"));
                updateDepositPreview(creditPreview, amount.getText().toString(), method.optString("currency", "USD"), dopPerUsd);
            });
            methodList.addView(option, params(-1, dp(50), i == 0 ? 0 : 8));
        }
        content.addView(methodList);
        if (selected[0] == null) {
            info("Métodos no configurados", "Solicita a la administración activar al menos una cuenta autorizada.");
            return;
        }
        accountInfo.setText(depositMethodDetails(selected[0]));
        LinearLayout details = card();
        details.addView(text("DATOS DE LA CUENTA AUTORIZADA", 11, BLUE, Typeface.BOLD));
        details.addView(accountInfo, params(-1, -2, 8));
        content.addView(details, params(-1, -2, 12));
        section("Reportar el depósito");
        amount.setHint("Monto depositado en " + selected[0].optString("currency", "USD"));
        content.addView(amount, params(-1, dp(56), 0));
        content.addView(reference, params(-1, dp(56), 10));
        LinearLayout preview = card();
        preview.addView(creditPreview);
        preview.addView(text("La referencia será verificada antes de acreditar el saldo.", 11, MUTED, Typeface.NORMAL), params(-1, -2, 5));
        content.addView(preview, params(-1, -2, 12));
        amount.addTextChangedListener(new SimpleWatcher() { @Override public void afterTextChanged(Editable editable) { updateDepositPreview(creditPreview, editable.toString(), selected[0].optString("currency", "USD"), dopPerUsd); } });
        Button submit = primaryButton("Enviar depósito para validar");
        submit.setOnClickListener(v -> {
            double value = parseAmount(amount.getText().toString());
            String ref = reference.getText().toString().trim();
            if (value <= 0 || ref.length() < 4) { errorDialog("Revisa los datos", "Escribe el monto depositado y la referencia del comprobante."); return; }
            JSONObject method = selected[0];
            new AlertDialog.Builder(this).setTitle("Confirmar depósito")
                    .setMessage(method.optString("label") + "\n" + String.format(Locale.US, "%,.2f %s", value, method.optString("currency")) + "\nReferencia: " + ref + "\n\nComisión: 0%")
                    .setNegativeButton("Cancelar", null).setPositiveButton("Enviar", (d, w) -> submitDeposit(submit, method.optString("id"), value, ref)).show();
        });
        content.addView(submit, params(-1, dp(56), 2));
        renderDepositHistory(response.optJSONArray("deposits"));
    }

    private String depositMethodDetails(JSONObject method) {
        String account = method.optString("account");
        return method.optString("label") + "\nTitular: " + method.optString("recipient", "HispaniolaPay") + "\nCuenta / destino: " + (account.isEmpty() ? "Pendiente de configurar" : account) + "\n" + method.optString("detail") + "\n\n" + method.optString("instructions");
    }

    private void updateDepositPreview(TextView view, String raw, String currency, double dopPerUsd) {
        double value = parseAmount(raw);
        JSONObject rateInfo = rates();
        double usdValue = "DOP".equals(currency) ? value / dopPerUsd : "HTG".equals(currency) ? value / rateInfo.optDouble("htgPerUsd", 132.2) : value;
        double walletValue = fromUsd(usdValue, walletCurrency(), rateInfo);
        view.setText("Acreditación estimada: " + walletMoney(round(walletValue)) + " · Comisión: 0%");
    }

    private void submitDeposit(Button button, String methodId, double amount, String reference) {
        button.setEnabled(false); button.setText("Registrando depósito…");
        executor.execute(() -> {
            try {
                JSONObject response = api.createDeposit(new JSONObject().put("methodId", methodId).put("amount", amount).put("reference", reference));
                JSONObject deposit = response.optJSONObject("deposit");
                String depositStatus = deposit == null ? "pending" : deposit.optString("status", "pending");
                String statusLabel = "completed".equals(depositStatus) ? "ACREDITADO" : "rejected".equals(depositStatus) ? "RECHAZADO" : "PENDIENTE DE VALIDACIÓN";
                try { accountData = api.account(); } catch (Exception ignored) { }
                runOnUiThread(() -> new AlertDialog.Builder(this).setTitle("Depósito recibido")
                        .setMessage("Referencia HispaniolaPay: " + (deposit == null ? "" : deposit.optString("id")) + "\n\nEstado: " + statusLabel + "\nComisión: 0%\n\nTe notificaremos cuando el dinero esté disponible para remesas.")
                        .setCancelable(false).setPositiveButton("Ver estado", (d, w) -> showDeposit()).show());
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText("Enviar depósito para validar"); errorDialog("No se pudo registrar", friendly(error)); });
            }
        });
    }

    private void renderDepositHistory(JSONArray deposits) {
        section("Mis depósitos recientes");
        if (deposits == null || deposits.length() == 0) { info("Sin depósitos", "Tus solicitudes aparecerán aquí."); return; }
        for (int i = 0; i < deposits.length(); i++) {
            JSONObject item = deposits.optJSONObject(i); if (item == null) continue;
            String status = item.optString("status", "pending");
            String statusLabel = "completed".equals(status) ? "ACREDITADO" : "rejected".equals(status) ? "RECHAZADO" : "PENDIENTE";
            int color = "completed".equals(status) ? GREEN : "rejected".equals(status) ? RED : AMBER;
            LinearLayout panel = card();
            LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL);
            row.addView(text(item.optString("methodLabel", "Depósito"), 14, INK, Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1));
            row.addView(text(statusLabel, 11, color, Typeface.BOLD)); panel.addView(row);
            panel.addView(text(String.format(Locale.US, "%,.2f %s · Ref. %s", item.optDouble("amount"), item.optString("currency", "USD"), item.optString("reference")), 12, MUTED, Typeface.NORMAL), params(-1, -2, 6));
            if ("rejected".equals(status) && !item.optString("rejectionReason").isEmpty()) panel.addView(text(item.optString("rejectionReason"), 11, RED, Typeface.NORMAL), params(-1, -2, 5));
            content.addView(panel, params(-1, -2, 8));
        }
    }

    private void showSend() {
        activeScreen = "Enviar";
        renderShell("Enviar a Haití", "Acredita directamente en NatCash o MonCash");
        JSONObject account = account();
        JSONObject rates = rates();
        double balance = walletBalance(account);
        String sourceCurrency = walletCurrency();
        double rate = rates.optDouble("htgPerUsd", 132.2);
        double dopToHtg = rates.optDouble("htgPerDop", 2.03);
        double feePct = rates.optDouble("remittanceFeePercent", 8);
        LinearLayout miniBalance = card();
        miniBalance.addView(text("Saldo disponible", 12, MUTED, Typeface.BOLD));
        miniBalance.addView(text(walletMoney(balance), 25, INK, Typeface.BOLD), params(-1, -2, 5));
        content.addView(miniBalance);

        section("Selecciona el destino");
        LinearLayout selector = new LinearLayout(this);
        selector.setOrientation(LinearLayout.HORIZONTAL);
        Button natcash = operatorButton("NatCash", true);
        Button moncash = operatorButton("MonCash", false);
        selector.addView(natcash, new LinearLayout.LayoutParams(0, dp(52), 1));
        selector.addView(space(dp(10), 1));
        selector.addView(moncash, new LinearLayout.LayoutParams(0, dp(52), 1));
        content.addView(selector, params(-1, -2, 9));
        final String[] selected = {"NatCash"};

        section("Datos del envío");
        EditText phone = input("Número de Haití (8 dígitos)", InputType.TYPE_CLASS_PHONE);
        EditText name = input("Nombre del destinatario", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        EditText amount = input("Monto total en " + walletCurrency(), InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        TextView holderStatus = text("Al colocar el número, buscaremos un titular NatCash verificado.", 11, MUTED, Typeface.NORMAL);
        final String[] lastHolderLookup = {""};
        content.addView(phone, params(-1, dp(57), 9));
        content.addView(name, params(-1, dp(57), 11));
        content.addView(holderStatus, params(-1, -2, 5));
        content.addView(amount, params(-1, dp(57), 11));

        natcash.setOnClickListener(v -> {
            selected[0] = "NatCash";
            styleOperator(natcash, true);
            styleOperator(moncash, false);
            lookupNatCashHolder(phone, name, holderStatus, lastHolderLookup);
        });
        moncash.setOnClickListener(v -> {
            selected[0] = "MonCash";
            styleOperator(natcash, false);
            styleOperator(moncash, true);
            lastHolderLookup[0] = "";
            name.setEnabled(true);
            holderStatus.setTextColor(MUTED);
            holderStatus.setText("MonCash no ofrece consulta previa del titular por número.");
        });
        phone.addTextChangedListener(new SimpleWatcher() {
            @Override public void afterTextChanged(Editable editable) {
                if ("NatCash".equals(selected[0])) lookupNatCashHolder(phone, name, holderStatus, lastHolderLookup);
            }
        });

        LinearLayout quote = card();
        TextView quoteAmount = text("El destinatario recibe: 0 HTG", 17, INK, Typeface.BOLD);
        TextView quoteFee = text(String.format(Locale.US, "Tarifa %.1f%% incluida", feePct), 12, MUTED, Typeface.NORMAL);
        quote.addView(quoteAmount);
        quote.addView(quoteFee, params(-1, -2, 5));
        content.addView(quote, params(-1, -2, 13));
        amount.addTextChangedListener(new SimpleWatcher() {
            @Override public void afterTextChanged(Editable editable) {
                double value = parseAmount(editable.toString());
                double valueUsd = toUsd(value, sourceCurrency, rates);
                double fee = value * feePct / 100d;
                double feeUsd = valueUsd * feePct / 100d;
                double receivesHtg = "DOP".equals(sourceCurrency) ? Math.max(0, value - fee) * dopToHtg : "HTG".equals(sourceCurrency) ? Math.max(0, value - fee) : Math.max(0, valueUsd - feeUsd) * rate;
                quoteAmount.setText(String.format(Locale.US, "El destinatario recibe: %,.2f HTG", receivesHtg));
                quoteFee.setText("DOP".equals(sourceCurrency)
                        ? String.format(Locale.US, "Tarifa %.1f%%: %s · RD$1 = %.3f HTG", feePct, walletMoney(fee), dopToHtg)
                        : String.format(Locale.US, "Tarifa %.1f%%: %s · 1 USD = %,.2f HTG", feePct, walletMoney(fee), rate));
            }
        });

        Button send = primaryButton("Revisar y enviar");
        content.addView(send, params(-1, dp(56), 15));
        TextView disclaimer = text("Al continuar confirmas que el nombre y número pertenecen al destinatario correcto.", 12, MUTED, Typeface.NORMAL);
        disclaimer.setGravity(Gravity.CENTER);
        content.addView(disclaimer, params(-1, -2, 10));
        send.setOnClickListener(v -> {
            String recipient = name.getText().toString().trim();
            String recipientPhone = phone.getText().toString().replaceAll("\\D", "");
            if (recipientPhone.startsWith("509")) recipientPhone = recipientPhone.substring(3);
            double value = parseAmount(amount.getText().toString());
            if (("MonCash".equals(selected[0]) && recipient.length() < 3) || recipientPhone.length() != 8 || value < 1) { errorDialog("Revisa los datos", "Completa un teléfono haitiano de 8 dígitos, un monto válido y el nombre cuando uses MonCash."); return; }
            if (value > balance) { errorDialog("Saldo insuficiente", "Disponible: " + walletMoney(balance)); return; }
            double fee = round(value * feePct / 100d);
            double valueUsd = toUsd(value, sourceCurrency, rates);
            double htg = round("DOP".equals(sourceCurrency) ? (value - fee) * dopToHtg : "HTG".equals(sourceCurrency) ? value - fee : (valueUsd - (valueUsd * feePct / 100d)) * rate);
            String finalPhone = recipientPhone;
            boolean requiresNatCashVerification = "NatCash".equals(selected[0]);
            new AlertDialog.Builder(this).setTitle(requiresNatCashVerification ? "Consultar titular NatCash" : "Confirmar remesa MonCash")
                    .setMessage(selected[0] + " · +509 " + finalPhone + "\n" + recipient + "\n\nDebitar: " + walletMoney(value) + "\nRecibe: " + String.format(Locale.US, "%,.2f HTG", htg) + "\nTarifa incluida: " + walletMoney(fee)
                            + (requiresNatCashVerification ? "\n\nNatCash mostrará el titular real antes del débito final." : "\n\nMonCash no ofrece consulta independiente del titular antes del envío."))
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton(requiresNatCashVerification ? "Consultar titular" : "Enviar ahora", (dialog, which) -> executeSend(send, selected[0], recipient, finalPhone, value)).show();
        });
    }

    private void lookupNatCashHolder(EditText phoneInput, EditText nameInput, TextView statusView, String[] lastLookup) {
        String digits = phoneInput.getText().toString().replaceAll("\\D", "");
        if (digits.startsWith("509")) digits = digits.substring(3);
        if (digits.length() != 8) {
            lastLookup[0] = "";
            if (!nameInput.isEnabled()) nameInput.setText("");
            nameInput.setEnabled(true);
            statusView.setTextColor(MUTED);
            statusView.setText("Completa los 8 dígitos para buscar el titular NatCash.");
            return;
        }

        String fullPhone = "509" + digits;
        if (fullPhone.equals(lastLookup[0])) return;
        lastLookup[0] = fullPhone;
        if (!nameInput.isEnabled()) nameInput.setText("");
        nameInput.setEnabled(true);
        statusView.setTextColor(BLUE);
        statusView.setText("Consultando titular NatCash…");
        executor.execute(() -> {
            try {
                JSONObject response = api.lookupRemittanceAccount(fullPhone);
                JSONObject holder = response.optJSONObject("accountHolder");
                String holderName = holder == null ? "" : holder.optString("name", "").trim();
                boolean verified = holder != null && holder.optBoolean("verified", false) && !holderName.isEmpty();
                runOnUiThread(() -> {
                    String current = phoneInput.getText().toString().replaceAll("\\D", "");
                    if (!current.endsWith(fullPhone.substring(3))) return;
                    if (verified) {
                        nameInput.setText(holderName);
                        nameInput.setEnabled(false);
                        statusView.setTextColor(GREEN);
                        statusView.setText("✓ Titular NatCash verificado automáticamente por API");
                    } else {
                        nameInput.setEnabled(true);
                        statusView.setTextColor(MUTED);
                        statusView.setText(response.optString("message", "NatCash no pudo identificar el titular."));
                    }
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    nameInput.setEnabled(true);
                    statusView.setTextColor(RED);
                    statusView.setText("No se pudo consultar: " + friendly(error));
                });
            }
        });
    }

    private void showTransfer() { showTransfer(""); }

    private void showTransfer(String prefilledRecipient) {
        activeScreen = "Transferir";
        JSONObject current = account();
        double balance = walletBalance(current);
        renderShell("Transferir saldo", "Entre clientes y subagentes HispaniolaPay");
        balanceCard(balance);
        info("Transferencia inmediata", "Usa el código de cliente, código de subagente o correo registrado. Comisión: 0.30% del monto enviado.");
        JSONObject rateInfo = rates();
        info("Tasas transparentes", String.format(Locale.US,
                "1 USD = RD$%,.4f · 1 USD = G%,.4f",
                rateInfo.optDouble("dopPerUsd", 58.5), rateInfo.optDouble("htgPerUsd", 132.2)));
        section("Destinatario y monto");
        EditText recipient = input("Código o correo del destinatario", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        if (prefilledRecipient != null && !prefilledRecipient.isEmpty()) recipient.setText(prefilledRecipient.toUpperCase(Locale.ROOT));
        EditText amount = input("Monto a transferir en " + walletCurrency(), InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        content.addView(recipient, params(-1, dp(57), 0));
        content.addView(amount, params(-1, dp(57), 10));
        LinearLayout quote = card();
        TextView feeView = text("Comisión 0.30%: " + walletMoney(0), 13, MUTED, Typeface.BOLD);
        TextView debitView = text("Débito total: " + walletMoney(0), 17, INK, Typeface.BOLD);
        quote.addView(debitView); quote.addView(feeView, params(-1, -2, 6));
        content.addView(quote, params(-1, -2, 12));
        amount.addTextChangedListener(new SimpleWatcher() { @Override public void afterTextChanged(Editable editable) {
            double value = parseAmount(editable.toString());
            double fee = round(value * 0.003d);
            feeView.setText("Comisión 0.30%: " + walletMoney(fee));
            debitView.setText("Débito total: " + walletMoney(round(value + fee)));
        }});
        Button submit = primaryButton("Revisar transferencia");
        submit.setOnClickListener(v -> {
            String destination = recipient.getText().toString().trim();
            double value = round(parseAmount(amount.getText().toString()));
            double fee = round(value * 0.003d);
            double total = round(value + fee);
            if (destination.length() < 3 || value <= 0) { errorDialog("Revisa los datos", "Escribe un código o correo registrado y un monto válido."); return; }
            if (total > balance) {
                String cause = "Necesitas " + walletMoney(total) + " y tienes " + walletMoney(balance) + ". La transferencia no fue realizada.";
                HispaniolaMessagingService.notify(this, "Transferencia no realizada", cause);
                errorDialog("Saldo insuficiente", cause);
                return;
            }
            reviewTransfer(submit, destination, value);
        });
        content.addView(submit, params(-1, dp(56), 14));
    }

    private void reviewTransfer(Button button, String recipient, double amount) {
        button.setEnabled(false); button.setText("Consultando tasa y destinatario…");
        executor.execute(() -> {
            try {
                JSONObject response = api.quoteBalanceTransfer(new JSONObject().put("recipient", recipient).put("amount", amount));
                JSONObject quote = response.optJSONObject("quote");
                if (quote == null) throw new Exception("No se recibió la cotización de la transferencia");
                String source = quote.optString("sourceCurrency", walletCurrency());
                String destination = quote.optString("destinationCurrency", source);
                String message = "Destinatario: " + quote.optString("recipientName", recipient)
                        + "\nMonto: " + currencyMoney(amount, source)
                        + "\nComisión 0.30%: " + currencyMoney(quote.optDouble("feeAmount"), source)
                        + "\nDébito total: " + currencyMoney(quote.optDouble("totalDebit"), source)
                        + "\n\nTasa aplicada: " + quote.optString("rateText")
                        + "\nEl destinatario recibe: " + currencyMoney(quote.optDouble("creditedAmount"), destination);
                runOnUiThread(() -> {
                    button.setEnabled(true); button.setText("Revisar transferencia");
                    if (!quote.optBoolean("sufficientBalance", false)) {
                        String cause = "Saldo insuficiente. Necesitas " + currencyMoney(quote.optDouble("totalDebit"), source)
                                + " y tienes " + currencyMoney(quote.optDouble("availableBalance"), source) + ".";
                        HispaniolaMessagingService.notify(this, "Transferencia no realizada", cause);
                        errorDialog("Saldo insuficiente", cause);
                        return;
                    }
                    new AlertDialog.Builder(this).setTitle("Confirmar transferencia")
                            .setMessage(message).setNegativeButton("Cancelar", null)
                            .setPositiveButton("Transferir ahora", (dialog, which) -> executeTransfer(button, recipient, amount)).show();
                });
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText("Revisar transferencia"); errorDialog("No se pudo cotizar", friendly(error)); });
            }
        });
    }

    private void executeTransfer(Button button, String recipient, double amount) {
        button.setEnabled(false); button.setText("Transfiriendo de forma segura…");
        executor.execute(() -> {
            try {
                JSONObject response = api.transferBalance(new JSONObject().put("recipient", recipient).put("amount", amount).put("idempotencyKey", UUID.randomUUID().toString()));
                JSONObject transfer = response.optJSONObject("transfer");
                accountData = api.account();
                runOnUiThread(() -> {
                    AlertDialog.Builder completedDialog = new AlertDialog.Builder(this).setTitle("Transferencia completada")
                            .setMessage("Destinatario: " + (transfer == null ? recipient : transfer.optString("recipientName", recipient)) + "\nMonto acreditado: " + (transfer == null ? "" : currencyMoney(transfer.optDouble("creditedAmount"), transfer.optString("destinationCurrency"))) + "\nTasa aplicada: " + (transfer == null ? "" : transfer.optString("rateText")) + "\nComisión: 0.30%\nReferencia: " + (transfer == null ? "" : transfer.optString("id")))
                            .setCancelable(false).setPositiveButton("Ver saldo actualizado", (dialog, which) -> showHome());
                    if (receiptEnabled() && transfer != null) completedDialog.setNeutralButton("Recibo " + receiptPaperWidthMm() + " mm", (dialog, which) -> receiptManager.showActions(transfer, accountData));
                    completedDialog.show();
                });
            } catch (Exception error) {
                try { accountData = api.account(); } catch (Exception ignored) { }
                runOnUiThread(() -> { showTransfer(); errorDialog("No se completó la transferencia", friendly(error)); });
            }
        });
    }

    private void executeSend(Button button, String operator, String recipient, String phone, double amount) {
        button.setEnabled(false);
        String idempotencyKey = UUID.randomUUID().toString();
        if (!"NatCash".equals(operator)) {
            button.setText("Procesando de forma segura…");
            performRemittance(button, operator, recipient, phone, amount, idempotencyKey, "");
            return;
        }

        button.setText("Consultando titular NatCash…");
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject().put("operator", operator).put("recipientName", recipient).put("recipientPhone", phone).put("amount", amount).put("sourceCurrency", walletCurrency()).put("idempotencyKey", idempotencyKey);
                JSONObject response = api.previewRemittance(payload);
                JSONObject preview = response.optJSONObject("preview");
                if (preview == null || !preview.optBoolean("recipientNameVerified", false)) throw new Exception("NatCash no devolvió un titular verificable");
                String holder = preview.optString("accountName", "").trim();
                String previewId = preview.optString("id", "");
                double amountHtg = preview.optDouble("amountHTG", 0);
                runOnUiThread(() -> {
                    button.setEnabled(true);
                    button.setText("Revisar y enviar");
                    new AlertDialog.Builder(this)
                            .setTitle("Titular confirmado por NatCash")
                            .setMessage("Titular: " + holder + "\nCuenta: +509 " + phone + "\nRecibirá: " + String.format(Locale.US, "%,.2f HTG", amountHtg) + "\n\nVerifica el nombre antes de confirmar. El saldo todavía no ha sido debitado.")
                            .setNegativeButton("Cancelar", null)
                            .setPositiveButton("Confirmar y enviar", (dialog, which) -> performRemittance(button, operator, holder, phone, amount, idempotencyKey, previewId))
                            .show();
                });
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText("Revisar y enviar"); errorDialog("No se pudo verificar el titular", friendly(error)); });
            }
        });
    }

    private void performRemittance(Button button, String operator, String recipient, String phone, double amount, String idempotencyKey, String previewId) {
        button.setEnabled(false);
        button.setText("Procesando de forma segura…");
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject().put("operator", operator).put("recipientName", recipient).put("recipientPhone", phone).put("amount", amount).put("sourceCurrency", walletCurrency()).put("idempotencyKey", idempotencyKey);
                if (previewId != null && !previewId.isEmpty()) payload.put("previewId", previewId);
                JSONObject response = api.sendRemittance(payload);
                JSONObject remittance = response.optJSONObject("remittance");
                double updatedBalance = response.optDouble("walletBalance", Double.NaN);
                if (!Double.isNaN(updatedBalance)) account().put("walletBalance", updatedBalance);
                try { accountData = api.account(); } catch (Exception ignored) { }
                runOnUiThread(() -> {
                    String txId = remittance == null ? "" : remittance.optString("txId");
                    String reference = remittance == null ? "" : remittance.optString("id");
                    String status = remittance == null ? "procesando" : remittance.optString("status", "procesando");
                    String holder = remittance == null ? recipient : remittance.optString("recipientName", recipient);
                    boolean holderVerified = remittance != null && remittance.optBoolean("recipientNameVerified", false);
                    String holderLabel = holderVerified ? "Titular confirmado por API" : "Destinatario";
                    AlertDialog.Builder completedDialog = new AlertDialog.Builder(this).setTitle("¡Remesa enviada!")
                            .setMessage(holderLabel + ": " + holder + "\nOperador: " + operator + "\nEstado: " + status.toUpperCase(Locale.ROOT) + "\nReferencia: " + (txId.isEmpty() ? reference : txId) + "\n\nPuedes consultar esta operación en Historial.")
                            .setCancelable(false).setPositiveButton("Ver saldo actualizado", (d, w) -> showHome());
                    if (receiptEnabled() && remittance != null) completedDialog.setNeutralButton("Recibo " + receiptPaperWidthMm() + " mm", (dialog, which) -> receiptManager.showActions(remittance, accountData));
                    completedDialog.show();
                });
            } catch (Exception error) {
                try { accountData = api.account(); } catch (Exception ignored) { }
                runOnUiThread(() -> { showSend(); errorDialog("No se completó el envío", friendly(error)); });
            }
        });
    }

    private void showHistory() {
        activeScreen = "Historial";
        renderShell("Historial", "Tus remesas y referencias recientes");
        if (receiptEnabled()) info("Facturas habilitadas", "Pulsa Factura PDF · Imprimir en cualquier movimiento para compartir el comprobante por WhatsApp o imprimirlo por Bluetooth.");
        addRecent(50);
    }

    private void openHistory() {
        showLoading("Actualizando historial y permisos…");
        executor.execute(() -> {
            try {
                accountData = api.account();
                runOnUiThread(this::showHistory);
            } catch (Exception error) {
                runOnUiThread(() -> { showWallet(); errorDialog("No se pudo abrir el historial", friendly(error)); });
            }
        });
    }

    private void showNotifications() {
        activeScreen = "Avisos";
        showLoading("Cargando tus notificaciones…");
        executor.execute(() -> {
            try {
                JSONObject response = api.notifications();
                runOnUiThread(() -> renderNotifications(response));
            } catch (Exception error) {
                runOnUiThread(() -> { showHome(); errorDialog("No se pudieron cargar los avisos", friendly(error)); });
            }
        });
    }

    private void renderNotifications(JSONObject response) {
        int unread = response.optInt("unread", 0);
        renderShell("Notificaciones", unread == 1 ? "Tienes 1 aviso nuevo" : "Tienes " + unread + " avisos nuevos");
        if (unread > 0) {
            Button markRead = secondaryButton("Marcar todas como leídas");
            markRead.setOnClickListener(v -> executor.execute(() -> {
                try { api.markNotificationsRead(""); runOnUiThread(this::showNotifications); }
                catch (Exception error) { runOnUiThread(() -> toast(friendly(error))); }
            }));
            content.addView(markRead, params(-1, dp(50), 0));
        }
        JSONArray items = response.optJSONArray("notifications");
        if (items == null || items.length() == 0) {
            info("Todo al día", "Aquí aparecerán tus depósitos acreditados, remesas y avisos importantes.");
            return;
        }
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i); if (item == null) continue;
            boolean read = item.optBoolean("read", false);
            LinearLayout card = card();
            card.setBackground(round(read ? SURFACE : SURFACE_ALT, 19, read ? LINE : (darkMode ? Color.rgb(52, 98, 145) : Color.rgb(160, 204, 250)), 1));
            LinearLayout titleRow = new LinearLayout(this); titleRow.setGravity(Gravity.CENTER_VERTICAL);
            titleRow.addView(text("deposit".equals(item.optString("type")) ? "+" : "●", 19, "deposit".equals(item.optString("type")) ? GREEN : BLUE, Typeface.BOLD), new LinearLayout.LayoutParams(dp(28), -2));
            titleRow.addView(text(item.optString("title", "HispaniolaPay"), 15, INK, Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1));
            if (!read) titleRow.addView(text("NUEVO", 10, BLUE, Typeface.BOLD));
            card.addView(titleRow);
            card.addView(text(item.optString("body"), 13, MUTED, Typeface.NORMAL), params(-1, -2, 8));
            String date = item.optString("createdAt");
            if (!date.isEmpty()) card.addView(text(date.replace('T', ' ').replace("Z", " UTC"), 10, MUTED, Typeface.NORMAL), params(-1, -2, 8));
            String notificationId = item.optString("id");
            card.setOnClickListener(v -> executor.execute(() -> { try { api.markNotificationsRead(notificationId); runOnUiThread(this::showNotifications); } catch (Exception ignored) {} }));
            content.addView(card, params(-1, -2, i == 0 ? 14 : 9));
        }
    }

    private void showProfile() {
        activeScreen = "Perfil";
        JSONObject account = account();
        renderShell("Mi perfil", "Datos vinculados a tu cuenta");
        LinearLayout panel = card();
        panel.addView(text(account.optString("name", "Cliente"), 21, INK, Typeface.BOLD));
        panel.addView(text(account.optString("email", ""), 14, MUTED, Typeface.NORMAL), params(-1, -2, 5));
        panel.addView(text("Código: " + account.optString("clientCode", "Sin asignar"), 13, BLUE, Typeface.BOLD), params(-1, -2, 14));
        panel.addView(text("Teléfono: " + account.optString("phone", "No registrado"), 13, MUTED, Typeface.NORMAL), params(-1, -2, 6));
        panel.addView(text("Moneda principal: " + walletCurrency(), 13, MUTED, Typeface.BOLD), params(-1, -2, 6));
        if (account.optDouble("benefitRatePercent", 0) > 0) panel.addView(text(String.format(Locale.US, "Beneficio acumulado: RD$ %,.2f (%.2f%%)", account.optDouble("benefitAccruedDOP", 0), account.optDouble("benefitRatePercent", 0)), 13, AMBER, Typeface.BOLD), params(-1, -2, 6));
        content.addView(panel);

        if (receiptEnabled()) {
            section("Facturación opcional");
            LinearLayout printerCard = card();
            printerCard.addView(text("Impresora térmica · " + receiptPaperWidthMm() + " mm", 17, INK, Typeface.BOLD));
            printerCard.addView(text(receiptManager.configuredPrinterName(), 12, BLUE, Typeface.BOLD), params(-1, -2, 7));
            printerCard.addView(text("Imprime comprobantes por Bluetooth o compártelos en PDF por WhatsApp.", 12, MUTED, Typeface.NORMAL), params(-1, -2, 7));
            printerCard.addView(text("Aplicación " + BuildConfig.VERSION_NAME, 11, MUTED, Typeface.NORMAL), params(-1, -2, 5));
            Button configurePrinter = secondaryButton("Configurar impresora Bluetooth");
            configurePrinter.setOnClickListener(v -> receiptManager.configurePrinter());
            printerCard.addView(configurePrinter, params(-1, dp(52), 12));
            content.addView(printerCard);
        }

        String clientCode = account.optString("clientCode", "").trim().toUpperCase(Locale.ROOT);
        if (!clientCode.isEmpty()) {
            String paymentLink = "https://hispaniolapay.com/pagar?to=" + Uri.encode(clientCode);
            section("Cobrar con HispaniolaPay");
            LinearLayout receiveCard = card();
            TextView qrTitle = text("Escanea para pagarme", 18, INK, Typeface.BOLD); qrTitle.setGravity(Gravity.CENTER);
            receiveCard.addView(qrTitle);
            ImageView qr = new ImageView(this); qr.setImageBitmap(paymentQr(paymentLink, 620)); qr.setContentDescription(tr("Escanea para pagarme"));
            receiveCard.addView(qr, params(-1, dp(245), 12));
            TextView code = text(clientCode, 24, BLUE, Typeface.BOLD); code.setGravity(Gravity.CENTER); code.setTextIsSelectable(true);
            receiveCard.addView(code, params(-1, -2, 10));
            TextView link = text(paymentLink, 11, MUTED, Typeface.NORMAL); link.setGravity(Gravity.CENTER); link.setTextIsSelectable(true);
            receiveCard.addView(link, params(-1, -2, 6));
            receiveCard.addView(text("Comparte tu QR, enlace o código para recibir saldo de otro usuario HispaniolaPay.", 12, MUTED, Typeface.NORMAL), params(-1, -2, 10));
            LinearLayout copyRow = new LinearLayout(this); copyRow.setOrientation(LinearLayout.HORIZONTAL);
            Button copyCode = secondaryButton("Copiar código");
            Button copyLink = secondaryButton("Copiar enlace");
            copyCode.setOnClickListener(v -> { copyText("HispaniolaPay", clientCode); toast("Código copiado"); });
            copyLink.setOnClickListener(v -> { copyText("HispaniolaPay", paymentLink); toast("Enlace copiado"); });
            copyRow.addView(copyCode, new LinearLayout.LayoutParams(0, dp(50), 1)); copyRow.addView(space(dp(8), 1)); copyRow.addView(copyLink, new LinearLayout.LayoutParams(0, dp(50), 1));
            receiveCard.addView(copyRow, params(-1, dp(50), 14));
            Button share = primaryButton("Compartir");
            share.setOnClickListener(v -> sharePaymentLink(clientCode, paymentLink));
            receiveCard.addView(share, params(-1, dp(52), 10));
            content.addView(receiveCard);
        }
        section("Editar información");
        EditText name = input("Nombre completo", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        name.setText(account.optString("name", ""));
        EditText phone = input("Teléfono / WhatsApp", InputType.TYPE_CLASS_PHONE);
        phone.setText(account.optString("phone", ""));
        EditText idNumber = input("Cédula o pasaporte", InputType.TYPE_CLASS_TEXT);
        idNumber.setText(account.optString("idNumber", ""));
        content.addView(name, params(-1, dp(56), 0)); content.addView(phone, params(-1, dp(56), 10)); content.addView(idNumber, params(-1, dp(56), 10));
        Button save = primaryButton("Guardar perfil");
        save.setOnClickListener(v -> {
            if (name.getText().toString().trim().length() < 2) { toast("Escribe tu nombre completo."); return; }
            save.setEnabled(false); save.setText("Guardando…");
            executor.execute(() -> {
                try {
                    api.updateProfile(new JSONObject().put("name", name.getText().toString().trim()).put("phone", phone.getText().toString().trim()).put("idNumber", idNumber.getText().toString().trim()).put("country", account.optString("country", "DO")).put("language", language));
                    accountData = api.account();
                    runOnUiThread(() -> { toast("Perfil actualizado correctamente."); showProfile(); });
                } catch (Exception error) { runOnUiThread(() -> { save.setEnabled(true); save.setText("Guardar perfil"); errorDialog("No se pudo guardar", friendly(error)); }); }
            });
        });
        content.addView(save, params(-1, dp(54), 14));
        section("Idioma");
        Button languageButton = secondaryButton(("en".equals(language) ? "English" : "ht".equals(language) ? "Kreyòl ayisyen" : "Español") + "  ▾");
        languageButton.setOnClickListener(v -> chooseLanguage());
        content.addView(languageButton, params(-1, dp(54), 0));
        section("Apariencia");
        LinearLayout appearance = new LinearLayout(this);
        appearance.setOrientation(LinearLayout.HORIZONTAL);
        Button light = secondaryButton("Claro");
        Button dark = secondaryButton("Oscuro");
        Button system = secondaryButton("Automático");
        light.setOnClickListener(v -> setAppearance("light"));
        dark.setOnClickListener(v -> setAppearance("dark"));
        system.setOnClickListener(v -> setAppearance("system"));
        appearance.addView(light, new LinearLayout.LayoutParams(0, dp(50), 1));
        appearance.addView(space(dp(8), 1));
        appearance.addView(dark, new LinearLayout.LayoutParams(0, dp(50), 1));
        appearance.addView(space(dp(8), 1));
        appearance.addView(system, new LinearLayout.LayoutParams(0, dp(50), 1));
        content.addView(appearance);
        content.addView(text("El modo automático sigue la configuración de tu teléfono.", 11, MUTED, Typeface.NORMAL), params(-1, -2, 8));
        info("Seguridad", "Tus credenciales, saldos y remesas se validan exclusivamente en los servidores seguros de HispaniolaPay.");
        Button refresh = secondaryButton("Actualizar información");
        refresh.setOnClickListener(v -> loadAccount(true));
        content.addView(refresh, params(-1, dp(54), 14));
        Button logout = secondaryButton("Cerrar sesión");
        logout.setTextColor(RED);
        logout.setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("Cerrar sesión").setMessage("¿Deseas salir de HispaniolaPay?").setNegativeButton("Cancelar", null).setPositiveButton("Salir", (d, w) -> { googleClient.signOut(); api.logout(); accountData = null; showLogin(); }).show());
        content.addView(logout, params(-1, dp(54), 10));
    }

    private void renderShell(String title, String subtitle) {
        LinearLayout root = column(); root.setBackgroundColor(BG);
        LinearLayout header = column(); header.setPadding(dp(21), dp(17), dp(21), dp(17)); header.setBackground(roundGradient(NAVY, BLUE, 0));
        LinearLayout brandRow = new LinearLayout(this); brandRow.setGravity(Gravity.CENTER_VERTICAL);
        ImageView logo = brandImage();
        brandRow.addView(logo, new LinearLayout.LayoutParams(dp(42), dp(42))); brandRow.addView(text("  HispaniolaPay", 18, Color.WHITE, Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1)); TextView bell = text("●", 20, Color.rgb(255, 207, 92), Typeface.BOLD); bell.setGravity(Gravity.CENTER); bell.setContentDescription("Abrir notificaciones"); bell.setOnClickListener(v -> showNotifications()); brandRow.addView(bell, new LinearLayout.LayoutParams(dp(42), dp(38))); header.addView(brandRow);
        header.addView(text(title, 25, Color.WHITE, Typeface.BOLD), params(-1, -2, 17)); header.addView(text(subtitle, 13, Color.rgb(211, 227, 250), Typeface.NORMAL), params(-1, -2, 4)); root.addView(header);
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); content = column(); content.setPadding(dp(18), dp(18), dp(18), dp(28)); scroll.addView(content); root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        root.addView(bottomNav(), new LinearLayout.LayoutParams(-1, dp(68))); setContentView(root);
    }

    private View bottomNav() {
        LinearLayout nav = new LinearLayout(this); nav.setGravity(Gravity.CENTER); nav.setPadding(dp(7), dp(5), dp(7), dp(5)); nav.setBackgroundColor(SURFACE);
        nav.addView(navButton("⌂", "Inicio", this::showHome), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("▣", "Billetera", this::showWallet), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("⚡", "Servicios", this::showRechargeServices), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("+", "Depositar", this::showDeposit), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("↗", "Enviar", this::showSend), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("●", "Perfil", this::showProfile), new LinearLayout.LayoutParams(0, -1, 1)); return nav;
    }

    private void syncPushToken() {
        FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token -> {
            getSharedPreferences("hispaniola_push", MODE_PRIVATE).edit().putString("fcmToken", token).apply();
            executor.execute(() -> { try { api.registerDeviceToken(token); } catch (Exception ignored) {} });
        });
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            NotificationChannel channel = new NotificationChannel(HispaniolaMessagingService.CHANNEL_ID, "Movimientos de billetera", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Depósitos y movimientos importantes de HispaniolaPay");
            manager.createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION);
        }
    }

    private View navButton(String icon, String label, Runnable action) {
        LinearLayout item = column(); item.setGravity(Gravity.CENTER); boolean active = activeScreen.equals(label);
        item.addView(text(icon, 18, active ? BLUE : MUTED, Typeface.BOLD)); item.addView(text(label, 10, active ? BLUE : MUTED, active ? Typeface.BOLD : Typeface.NORMAL)); item.setOnClickListener(v -> action.run()); return item;
    }

    private void balanceCard(double balance) {
        LinearLayout box = column(); box.setPadding(dp(20), dp(19), dp(20), dp(19)); box.setBackground(roundGradient(BLUE, CYAN, 22));
        LinearLayout top = new LinearLayout(this); top.setGravity(Gravity.CENTER_VERTICAL); top.addView(text("SALDO DISPONIBLE", 12, Color.rgb(220, 240, 255), Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1)); top.addView(text(walletCurrency(), 12, Color.WHITE, Typeface.BOLD)); box.addView(top);
        box.addView(text(walletMoney(balance), 34, Color.WHITE, Typeface.BOLD), params(-1, -2, 8)); box.addView(text("● Sincronizado ahora  ·  Disponible para todos los servicios", 12, Color.rgb(226, 242, 255), Typeface.NORMAL), params(-1, -2, 5)); content.addView(box);
        box.setAlpha(0f); box.setTranslationY(dp(18)); box.animate().alpha(1f).translationY(0f).setDuration(420).start();
    }

    private void addRecent(int limit) {
        JSONArray list = accountData == null ? null : accountData.optJSONArray("movements");
        if (list == null || list.length() == 0) {
            LinearLayout empty = card(); TextView icon = text("↗", 25, BLUE, Typeface.BOLD); icon.setGravity(Gravity.CENTER); empty.addView(icon);
            TextView title = text("Todavía no tienes movimientos", 16, INK, Typeface.BOLD); title.setGravity(Gravity.CENTER); empty.addView(title, params(-1, -2, 8));
            TextView detail = text("Tus depósitos, transferencias y remesas aparecerán aquí.", 13, MUTED, Typeface.NORMAL); detail.setGravity(Gravity.CENTER); empty.addView(detail, params(-1, -2, 5)); content.addView(empty); return;
        }
        for (int i = 0; i < Math.min(limit, list.length()); i++) {
            JSONObject tx = list.optJSONObject(i); if (tx == null) continue;
            boolean incoming = "in".equals(tx.optString("direction"));
            LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL); row.setPadding(dp(15), dp(14), dp(15), dp(14)); row.setBackground(round(SURFACE, 18, LINE, 1));
            TextView badge = text(incoming ? "+" : "↗", 16, Color.WHITE, Typeface.BOLD); badge.setGravity(Gravity.CENTER); badge.setBackground(round(incoming ? GREEN : BLUE, 13, Color.TRANSPARENT, 0)); row.addView(badge, new LinearLayout.LayoutParams(dp(42), dp(42)));
            LinearLayout labels = column(); labels.setPadding(dp(12), 0, dp(8), 0); labels.addView(text(tx.optString("title", "Movimiento"), 14, INK, Typeface.BOLD)); labels.addView(text(tx.optString("description", "Operación procesada"), 11, MUTED, Typeface.NORMAL), params(-1, -2, 3)); labels.addView(text(statusLabel(tx.optString("status")), 11, statusColor(tx.optString("status")), Typeface.BOLD), params(-1, -2, 4)); row.addView(labels, new LinearLayout.LayoutParams(0, -2, 1));
            LinearLayout totals = column(); totals.setGravity(Gravity.RIGHT); totals.addView(text((incoming ? "+" : "-") + movementMoney(tx), 14, incoming ? GREEN : INK, Typeface.BOLD)); totals.addView(text(tx.optString("currency", walletCurrency()), 11, MUTED, Typeface.NORMAL), params(-2, -2, 3));
            totals.addView(text(receiptEnabled() ? "DETALLES · PDF · IMPRIMIR" : "VER DETALLES", 9, BLUE, Typeface.BOLD), params(-2, -2, 7));
            row.addView(totals);
            row.setContentDescription("Ver detalles de " + tx.optString("title", "movimiento"));
            row.setOnClickListener(v -> receipt(tx));
            content.addView(row, params(-1, -2, i == 0 ? 0 : 9));
        }
    }

    private void receipt(JSONObject tx) {
        receiptManager.showDetails(tx, accountData, receiptEnabled());
    }

    private View actionTile(String icon, String title, String detail, int color, View.OnClickListener listener) {
        LinearLayout tile = column(); tile.setGravity(Gravity.CENTER_HORIZONTAL); tile.setPadding(dp(13), dp(15), dp(13), dp(12)); tile.setBackground(round(SURFACE, 22, LINE, 1));
        TextView iconView = text(icon, 24, color, Typeface.BOLD); iconView.setGravity(Gravity.CENTER); iconView.setBackground(round(Color.argb(32, Color.red(color), Color.green(color), Color.blue(color)), 16, Color.TRANSPARENT, 0));
        tile.addView(iconView, new LinearLayout.LayoutParams(dp(48), dp(48))); tile.addView(text(title, 15, INK, Typeface.BOLD), params(-2, -2, 7)); TextView d = text(detail, 11, MUTED, Typeface.NORMAL); d.setGravity(Gravity.CENTER); tile.addView(d, params(-1, -2, 4)); tile.setOnClickListener(listener); return tile;
    }

    private void section(String label) { content.addView(text(tr(label).toUpperCase(Locale.ROOT), 12, MUTED, Typeface.BOLD), params(-1, -2, 20)); }
    private void info(String title, String detail) { LinearLayout panel = card(); panel.setBackground(round(SURFACE_ALT, 18, darkMode ? Color.rgb(52, 79, 113) : Color.rgb(203, 224, 250), 1)); panel.addView(text(title, 14, darkMode ? Color.rgb(130, 190, 255) : NAVY, Typeface.BOLD)); panel.addView(text(detail, 12, MUTED, Typeface.NORMAL), params(-1, -2, 5)); content.addView(panel, params(-1, -2, 14)); }
    private LinearLayout card() { LinearLayout panel = column(); panel.setPadding(dp(17), dp(16), dp(17), dp(16)); panel.setBackground(round(SURFACE, 20, LINE, 1)); return panel; }
    private EditText input(String hint, int type) { EditText field = new EditText(this); field.setHint(tr(hint)); field.setTextSize(15); field.setTextColor(INK); field.setHintTextColor(MUTED); field.setSingleLine(true); field.setInputType(type); field.setPadding(dp(15), 0, dp(15), 0); field.setBackground(round(SURFACE, 16, LINE, 1)); return field; }
    private Button primaryButton(String label) { Button button = new Button(this); button.setText(tr(label)); button.setTextSize(15); button.setTextColor(Color.WHITE); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); button.setBackground(round(BLUE, 14, Color.TRANSPARENT, 0)); return button; }
    private Button secondaryButton(String label) { Button button = new Button(this); button.setText(tr(label)); button.setTextSize(14); button.setTextColor(darkMode ? Color.rgb(122, 184, 255) : BLUE); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); button.setBackground(round(SURFACE, 14, LINE, 1)); return button; }
    private Button operatorButton(String label, boolean selected) { Button button = new Button(this); button.setText(label); button.setTextSize(14); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); styleOperator(button, selected); return button; }
    private void styleOperator(Button button, boolean selected) {
        int brand = "MonCash".equalsIgnoreCase(button.getText().toString()) ? MONCASH_WINE : NATCASH_BLUE;
        button.setTextColor(selected ? Color.WHITE : brand);
        button.setBackground(round(selected ? brand : SURFACE, 14, selected ? brand : LINE, 1));
    }

    private void showLoading(String label) {
        FrameLayout frame = new FrameLayout(this);
        frame.setBackground(darkMode ? roundGradient(Color.rgb(7, 16, 31), Color.rgb(14, 35, 62), 0) : roundGradient(Color.rgb(244, 249, 255), Color.rgb(226, 240, 255), 0));
        LinearLayout box = column(); box.setGravity(Gravity.CENTER); box.setPadding(dp(24), dp(30), dp(24), dp(30));
        ImageView logo = brandImage(); box.addView(logo, new LinearLayout.LayoutParams(dp(92), dp(92)));
        TextView moneyFlow = text("$   RD$   HTG", 16, GREEN, Typeface.BOLD); moneyFlow.setGravity(Gravity.CENTER); box.addView(moneyFlow, params(-1, -2, 20));
        ProgressBar progress = new ProgressBar(this); box.addView(progress, new LinearLayout.LayoutParams(dp(36), dp(36)));
        TextView message = text(label, 14, MUTED, Typeface.BOLD); message.setGravity(Gravity.CENTER); box.addView(message, params(-1, -2, 12));
        box.addView(text("Conectando tu dinero de forma segura", 11, Color.rgb(111, 128, 151), Typeface.NORMAL), params(-2, -2, 6));
        frame.addView(box, new FrameLayout.LayoutParams(-1, -1)); setContentView(frame);

        ObjectAnimator logoUp = ObjectAnimator.ofFloat(logo, View.TRANSLATION_Y, 0f, -dp(10), 0f);
        logoUp.setDuration(1300); logoUp.setRepeatCount(ObjectAnimator.INFINITE);
        ObjectAnimator logoPulseX = ObjectAnimator.ofFloat(logo, View.SCALE_X, 1f, 1.07f, 1f);
        ObjectAnimator logoPulseY = ObjectAnimator.ofFloat(logo, View.SCALE_Y, 1f, 1.07f, 1f);
        logoPulseX.setDuration(1300); logoPulseY.setDuration(1300);
        logoPulseX.setRepeatCount(ObjectAnimator.INFINITE); logoPulseY.setRepeatCount(ObjectAnimator.INFINITE);
        ObjectAnimator moneyMove = ObjectAnimator.ofFloat(moneyFlow, View.TRANSLATION_X, -dp(16), dp(16), -dp(16));
        ObjectAnimator moneyFade = ObjectAnimator.ofFloat(moneyFlow, View.ALPHA, .35f, 1f, .35f);
        moneyMove.setDuration(1800); moneyFade.setDuration(1800);
        moneyMove.setRepeatCount(ObjectAnimator.INFINITE); moneyFade.setRepeatCount(ObjectAnimator.INFINITE);
        AnimatorSet animation = new AnimatorSet(); animation.playTogether(logoUp, logoPulseX, logoPulseY, moneyMove, moneyFade); animation.start();
    }
    private JSONObject account() { JSONObject value = accountData == null ? null : accountData.optJSONObject("account"); return value == null ? new JSONObject() : value; }
    private JSONObject rates() { JSONObject value = accountData == null ? null : accountData.optJSONObject("rates"); return value == null ? new JSONObject() : value; }
    private boolean receiptEnabled() {
        JSONObject account = account();
        JSONObject subAgent = accountData == null ? null : accountData.optJSONObject("subAgent");
        return account.optBoolean("receiptPrintingEnabled", false)
                || (subAgent != null && subAgent.optBoolean("receiptPrintingEnabled", false));
    }
    private int receiptPaperWidthMm() {
        JSONObject account = account();
        JSONObject subAgent = accountData == null ? null : accountData.optJSONObject("subAgent");
        int value = account.optInt("receiptPaperWidthMm", 58);
        if (value != 78 && subAgent != null) value = subAgent.optInt("receiptPaperWidthMm", 58);
        return value == 78 ? 78 : 58;
    }
    private boolean isInvoiceProduct(JSONObject product) {
        String category = normalizeProductName(product.optString("category"));
        String type = normalizeProductName(product.optString("type"));
        String name = normalizeProductName(product.optString("name"));
        if ("invoice".equals(category) || "factura".equals(type)) return true;
        if ("mobile-topup".equals(category) || "data-plan".equals(category) || "recarga".equals(type) || "paquetico".equals(type)) return false;
        String[] providers = {"edenorte", "corasan", "coraasan", "claro", "altice", "viva", "edeeste", "edesur", "wind", "caasd", "cepm", "ceb", "adn", "coraplata", "coraaplata", "coraavega", "coaarom", "dgii", "pgr multas", "tss", "midas seguros", "midas"};
        for (String provider : providers) if (name.equals(provider) || name.contains(provider)) return true;
        return false;
    }
    private String normalizeProductName(String value) {
        return java.text.Normalizer.normalize(value == null ? "" : value.trim().toLowerCase(Locale.ROOT), java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
    private String friendly(Exception error) {
        String message = error.getMessage();
        if (message == null || message.trim().isEmpty()) return "Ocurrió un inconveniente inesperado. Intenta nuevamente.";
        String lower = message.toLowerCase(Locale.ROOT);
        if (lower.contains("unable to resolve host") || lower.contains("no pudimos establecer una conexión") || lower.contains("ssl") || lower.contains("handshake") || lower.contains("protocol error") || lower.contains("failed to connect")) return "No pudimos conectar de forma segura. Verifica tu internet e intenta nuevamente.";
        if (lower.contains("timeout") || lower.contains("timed out")) return "La operación tardó demasiado. Revisa tu conexión e intenta nuevamente.";
        if (lower.contains("doctype") || lower.contains("respuesta no válida")) return "El servicio está actualizándose. Espera unos segundos e intenta nuevamente.";
        return message;
    }

    private void errorDialog(String title, String message) {
        Dialog dialog = new Dialog(this);
        LinearLayout card = column();
        card.setPadding(dp(24), dp(22), dp(24), dp(20));
        card.setBackground(round(SURFACE, 26, LINE, 1));

        LinearLayout heading = new LinearLayout(this);
        heading.setGravity(Gravity.CENTER_VERTICAL);
        TextView icon = text("!", 20, Color.WHITE, Typeface.BOLD);
        icon.setGravity(Gravity.CENTER);
        icon.setBackground(round(RED, 15, Color.TRANSPARENT, 0));
        heading.addView(icon, new LinearLayout.LayoutParams(dp(42), dp(42)));
        LinearLayout labels = column();
        labels.setPadding(dp(13), 0, 0, 0);
        labels.addView(text(title, 19, INK, Typeface.BOLD));
        labels.addView(text("HispaniolaPay", 11, MUTED, Typeface.BOLD), params(-1, -2, 3));
        heading.addView(labels, new LinearLayout.LayoutParams(0, -2, 1));
        card.addView(heading);

        TextView detail = text(message, 14, MUTED, Typeface.NORMAL);
        detail.setLineSpacing(dp(3), 1f);
        card.addView(detail, params(-1, -2, 18));

        Button close = primaryButton("Entendido");
        close.setOnClickListener(v -> dialog.dismiss());
        card.addView(close, params(-1, dp(52), 4));
        dialog.setContentView(card);
        dialog.setCancelable(true);
        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            window.addFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            android.view.WindowManager.LayoutParams attributes = window.getAttributes();
            attributes.dimAmount = 0.62f;
            window.setAttributes(attributes);
        }
        dialog.show();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(getResources().getDisplayMetrics().widthPixels - dp(40), android.view.ViewGroup.LayoutParams.WRAP_CONTENT);
        }
    }
    private String statusLabel(String status) { if ("completed".equals(status)) return tr("COMPLETADA"); if ("failed".equals(status)) return tr("RECHAZADA"); if ("review".equals(status)) return tr("EN REVISIÓN"); if ("processing".equals(status)) return tr("PROCESANDO"); return tr("PENDIENTE"); }
    private int statusColor(String status) { if ("completed".equals(status)) return GREEN; if ("failed".equals(status)) return RED; if ("review".equals(status)) return AMBER; return BLUE; }
    private double parseAmount(String value) { try { return Double.parseDouble(value.trim()); } catch (Exception ignored) { return 0; } }
    private double round(double value) { return Math.round(value * 100d) / 100d; }
    private String money(double value) { return usd.format(value); }
    private String walletCurrency() { String value = account().optString("primaryCurrency", "USD"); return "DOP".equals(value) || "HTG".equals(value) ? value : "USD"; }
    private double walletBalance(JSONObject account) { return account.has("walletBalance") ? account.optDouble("walletBalance", 0) : account.optDouble("walletBalanceUSD", 0); }
    private double walletSavings(JSONObject account) { return account.has("savingsBalance") ? account.optDouble("savingsBalance", 0) : account.optDouble("savingsBalanceUSD", 0); }
    private String currencyMoney(double value, String currency) { String symbol = "DOP".equals(currency) ? "RD$" : "HTG".equals(currency) ? "G" : "US$"; return symbol + String.format(Locale.US, "%,.2f", value) + " " + currency; }
    private String walletMoney(double value) { return currencyMoney(value, walletCurrency()).replace(" " + walletCurrency(), ""); }
    private String movementMoney(JSONObject item) { String currency = item.optString("sourceCurrency", item.optString("currency", "USD")); double value = item.has("amount") ? item.optDouble("amount", 0) : item.optDouble("amountUSD", 0); return currencyMoney(value, currency); }
    private double toUsd(double amount, String currency, JSONObject rateInfo) { if ("DOP".equals(currency)) return amount / rateInfo.optDouble("dopPerUsd", 58.5); if ("HTG".equals(currency)) return amount / rateInfo.optDouble("htgPerUsd", 132.2); return amount; }
    private double fromUsd(double amount, String currency, JSONObject rateInfo) { if ("DOP".equals(currency)) return amount * rateInfo.optDouble("dopPerUsd", 58.5); if ("HTG".equals(currency)) return amount * rateInfo.optDouble("htgPerUsd", 132.2); return amount; }
    private String firstName(String name) { String trimmed = name.trim(); int split = trimmed.indexOf(' '); return split > 0 ? trimmed.substring(0, split) : trimmed; }
    private Bitmap paymentQr(String value, int pixels) {
        try {
            BitMatrix matrix = new MultiFormatWriter().encode(value, BarcodeFormat.QR_CODE, pixels, pixels);
            Bitmap bitmap = Bitmap.createBitmap(pixels, pixels, Bitmap.Config.RGB_565);
            for (int y = 0; y < pixels; y++) for (int x = 0; x < pixels; x++) bitmap.setPixel(x, y, matrix.get(x, y) ? NAVY : Color.WHITE);
            return bitmap;
        } catch (Exception error) {
            return Bitmap.createBitmap(2, 2, Bitmap.Config.RGB_565);
        }
    }
    private void copyText(String label, String value) { ((ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE)).setPrimaryClip(ClipData.newPlainText(label, value)); }
    private void sharePaymentLink(String code, String link) {
        Intent share = new Intent(Intent.ACTION_SEND); share.setType("text/plain");
        share.putExtra(Intent.EXTRA_SUBJECT, "HispaniolaPay · " + code);
        share.putExtra(Intent.EXTRA_TEXT, tr("Puedes enviarme saldo en HispaniolaPay usando mi código") + " " + code + ":\n" + link);
        startActivity(Intent.createChooser(share, tr("Compartir")));
    }
    private String tr(String value) { return Translations.get(language, value); }
    private void toast(String message) { Toast.makeText(this, tr(message), Toast.LENGTH_LONG).show(); }
    private LinearLayout column() { LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); return layout; }
    private View space(int width, int height) { View view = new View(this); view.setLayoutParams(new LinearLayout.LayoutParams(width, height)); return view; }
    private TextView text(String value, float size, int color, int style) { TextView view = new TextView(this); view.setText(tr(value)); view.setTextSize(size); view.setTextColor(color); view.setTypeface(Typeface.DEFAULT, style); return view; }
    private ImageView brandImage() { ImageView image = new ImageView(this); image.setImageResource(R.drawable.hispaniolapay_mark); image.setScaleType(ImageView.ScaleType.FIT_CENTER); image.setPadding(dp(5), dp(5), dp(5), dp(5)); image.setBackground(round(SURFACE, 22, LINE, 1)); image.setContentDescription("Logo oficial de HispaniolaPay"); return image; }
    private LinearLayout.LayoutParams params(int width, int height, int top) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width, height); p.topMargin = dp(top); return p; }
    private GradientDrawable round(int color, int radius, int stroke, int strokeWidth) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); if (strokeWidth > 0) d.setStroke(dp(strokeWidth), stroke); return d; }
    private GradientDrawable roundGradient(int start, int end, int radius) { GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{start, end}); d.setCornerRadius(dp(radius)); return d; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private abstract static class SimpleWatcher implements TextWatcher { @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {} @Override public void onTextChanged(CharSequence s, int start, int before, int count) {} }
}
