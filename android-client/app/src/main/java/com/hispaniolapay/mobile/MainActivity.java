package com.hispaniolapay.mobile;

import android.animation.AnimatorSet;
import android.animation.ObjectAnimator;
import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
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

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;
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
    private static final int RED = Color.rgb(210, 54, 69);
    private static final int AMBER = Color.rgb(231, 151, 31);
    private int INK;
    private int MUTED;
    private int BG;
    private int LINE;
    private int SURFACE;
    private int SURFACE_ALT;
    private boolean darkMode;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final NumberFormat usd = NumberFormat.getCurrencyInstance(Locale.US);
    private ApiClient api;
    private GoogleSignInClient googleClient;
    private JSONObject accountData;
    private LinearLayout content;
    private String activeScreen = "Inicio";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        applySavedAppearance();
        Window window = getWindow();
        window.setStatusBarColor(NAVY);
        window.setNavigationBarColor(SURFACE);
        api = new ApiClient(this);
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
        if (api != null && api.hasSession() && (intent.getBooleanExtra("openNotifications", false) || "OPEN_NOTIFICATIONS".equals(intent.getAction()))) showNotifications();
    }

    private void loadAccount(boolean fullScreen) {
        if (fullScreen) showLoading("Sincronizando tu billetera…");
        executor.execute(() -> {
            try {
                accountData = api.account();
                runOnUiThread(() -> { syncPushToken(); if (getIntent().getBooleanExtra("openNotifications", false) || "OPEN_NOTIFICATIONS".equals(getIntent().getAction())) { getIntent().removeExtra("openNotifications"); getIntent().setAction(null); showNotifications(); } else showHome(); });
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
        balanceCard(account.optDouble("walletBalanceUSD", 0));
        section("Acciones rápidas");
        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        actions.addView(actionTile("↗", "Enviar", "NatCash y MonCash", BLUE, v -> showSend()), new LinearLayout.LayoutParams(0, dp(132), 1));
        actions.addView(space(dp(12), 1));
        actions.addView(actionTile("▣", "Billetera", "Saldo e historial", GREEN, v -> showWallet()), new LinearLayout.LayoutParams(0, dp(132), 1));
        content.addView(actions, params(-1, -2, 10));
        content.addView(actionTile("+", "Depositar en billetera", "Cuentas autorizadas · 0% de comisión", CYAN, v -> showDeposit()), params(-1, dp(98), 12));
        View alerts = actionTile("●", "Centro de notificaciones", "Depósitos, remesas y avisos de seguridad", AMBER, v -> showNotifications());
        content.addView(alerts, params(-1, dp(98), 12));
        section("Actividad reciente");
        addRecent(3);
        info("Operaciones protegidas", "Cada envío se valida en el servidor. Ninguna clave del proveedor se guarda en tu teléfono.");
    }

    private void showWallet() {
        activeScreen = "Billetera";
        JSONObject account = account();
        JSONObject rates = rates();
        renderShell("Mi billetera", "Saldos actualizados desde tu cuenta segura");
        balanceCard(account.optDouble("walletBalanceUSD", 0));
        LinearLayout savings = card();
        savings.addView(text("BOLSILLO DE AHORRO", 12, GREEN, Typeface.BOLD));
        savings.addView(text(money(account.optDouble("savingsBalanceUSD", 0)), 27, INK, Typeface.BOLD), params(-1, -2, 8));
        savings.addView(text("Fondos separados de tu saldo para envíos", 13, MUTED, Typeface.NORMAL), params(-1, -2, 4));
        content.addView(savings, params(-1, -2, 12));
        Button deposit = primaryButton("+ Depositar sin comisión");
        deposit.setOnClickListener(v -> showDeposit());
        content.addView(deposit, params(-1, dp(54), 12));
        double available = account.optDouble("walletBalanceUSD", 0);
        info("Equivalencias", String.format(Locale.US, "RD$ %,.2f DOP   ·   %,.0f HTG", available * rates.optDouble("dopPerUsd", 58.5), available * rates.optDouble("htgPerUsd", 132.2)));
        section("Movimientos y remesas");
        addRecent(20);
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
        double usdValue = "DOP".equals(currency) ? value / dopPerUsd : value;
        view.setText("Acreditación estimada: " + money(round(usdValue)) + " · Comisión: US$0.00");
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
        double balance = account.optDouble("walletBalanceUSD", 0);
        double rate = rates.optDouble("htgPerUsd", 132.2);
        double feePct = rates.optDouble("remittanceFeePercent", 8);
        LinearLayout miniBalance = card();
        miniBalance.addView(text("Saldo disponible", 12, MUTED, Typeface.BOLD));
        miniBalance.addView(text(money(balance), 25, INK, Typeface.BOLD), params(-1, -2, 5));
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
        natcash.setOnClickListener(v -> { selected[0] = "NatCash"; styleOperator(natcash, true); styleOperator(moncash, false); });
        moncash.setOnClickListener(v -> { selected[0] = "MonCash"; styleOperator(natcash, false); styleOperator(moncash, true); });

        section("Datos del envío");
        EditText name = input("Nombre completo del destinatario", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_CAP_WORDS);
        EditText phone = input("Número de Haití (8 dígitos)", InputType.TYPE_CLASS_PHONE);
        EditText amount = input("Monto total en USD", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        content.addView(name, params(-1, dp(57), 9));
        content.addView(phone, params(-1, dp(57), 11));
        content.addView(amount, params(-1, dp(57), 11));

        LinearLayout quote = card();
        TextView quoteAmount = text("El destinatario recibe: 0 HTG", 17, INK, Typeface.BOLD);
        TextView quoteFee = text(String.format(Locale.US, "Tarifa %.1f%% incluida", feePct), 12, MUTED, Typeface.NORMAL);
        quote.addView(quoteAmount);
        quote.addView(quoteFee, params(-1, -2, 5));
        content.addView(quote, params(-1, -2, 13));
        amount.addTextChangedListener(new SimpleWatcher() {
            @Override public void afterTextChanged(Editable editable) {
                double value = parseAmount(editable.toString());
                double fee = value * feePct / 100d;
                quoteAmount.setText(String.format(Locale.US, "El destinatario recibe: %,.2f HTG", Math.max(0, value - fee) * rate));
                quoteFee.setText(String.format(Locale.US, "Tarifa %.1f%%: %s · Tasa: %,.2f HTG", feePct, money(fee), rate));
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
            if (recipient.length() < 3 || recipientPhone.length() != 8 || value < 1) { errorDialog("Revisa los datos", "Completa el nombre, un teléfono haitiano de 8 dígitos y un monto válido."); return; }
            if (value > balance) { errorDialog("Saldo insuficiente", "Disponible: " + money(balance)); return; }
            double fee = round(value * feePct / 100d);
            double htg = round((value - fee) * rate);
            String finalPhone = recipientPhone;
            new AlertDialog.Builder(this).setTitle("Confirmar remesa")
                    .setMessage(selected[0] + " · +509 " + finalPhone + "\n" + recipient + "\n\nDebitar: " + money(value) + "\nRecibe: " + String.format(Locale.US, "%,.2f HTG", htg) + "\nTarifa incluida: " + money(fee))
                    .setNegativeButton("Cancelar", null)
                    .setPositiveButton("Enviar ahora", (dialog, which) -> executeSend(send, selected[0], recipient, finalPhone, value)).show();
        });
    }

    private void executeSend(Button button, String operator, String recipient, String phone, double amount) {
        button.setEnabled(false);
        button.setText("Procesando de forma segura…");
        executor.execute(() -> {
            try {
                JSONObject payload = new JSONObject().put("operator", operator).put("recipientName", recipient).put("recipientPhone", phone).put("amountUSD", amount).put("idempotencyKey", UUID.randomUUID().toString());
                JSONObject response = api.sendRemittance(payload);
                JSONObject remittance = response.optJSONObject("remittance");
                double updatedBalance = response.optDouble("walletBalanceUSD", Double.NaN);
                if (!Double.isNaN(updatedBalance)) account().put("walletBalanceUSD", updatedBalance);
                try { accountData = api.account(); } catch (Exception ignored) { }
                runOnUiThread(() -> {
                    String txId = remittance == null ? "" : remittance.optString("txId");
                    String reference = remittance == null ? "" : remittance.optString("id");
                    String status = remittance == null ? "procesando" : remittance.optString("status", "procesando");
                    new AlertDialog.Builder(this).setTitle("¡Remesa recibida!")
                            .setMessage("Estado: " + status.toUpperCase(Locale.ROOT) + "\nReferencia: " + (txId.isEmpty() ? reference : txId) + "\n\nPuedes consultar esta operación en Historial.")
                            .setCancelable(false).setPositiveButton("Ver saldo actualizado", (d, w) -> showHome()).show();
                });
            } catch (Exception error) {
                try { accountData = api.account(); } catch (Exception ignored) { }
                runOnUiThread(() -> { showSend(); errorDialog("No se completó el envío", friendly(error)); });
            }
        });
    }

    private void showHistory() { activeScreen = "Historial"; renderShell("Historial", "Tus remesas y referencias recientes"); addRecent(50); }

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
        content.addView(panel);
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
                    api.updateProfile(new JSONObject().put("name", name.getText().toString().trim()).put("phone", phone.getText().toString().trim()).put("idNumber", idNumber.getText().toString().trim()).put("country", account.optString("country", "DO")));
                    accountData = api.account();
                    runOnUiThread(() -> { toast("Perfil actualizado correctamente."); showProfile(); });
                } catch (Exception error) { runOnUiThread(() -> { save.setEnabled(true); save.setText("Guardar perfil"); errorDialog("No se pudo guardar", friendly(error)); }); }
            });
        });
        content.addView(save, params(-1, dp(54), 14));
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
        LinearLayout top = new LinearLayout(this); top.setGravity(Gravity.CENTER_VERTICAL); top.addView(text("SALDO DISPONIBLE", 12, Color.rgb(220, 240, 255), Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1)); top.addView(text("USD", 12, Color.WHITE, Typeface.BOLD)); box.addView(top);
        box.addView(text(money(balance), 34, Color.WHITE, Typeface.BOLD), params(-1, -2, 8)); box.addView(text("● Sincronizado ahora  ·  Disponible para remesas", 12, Color.rgb(226, 242, 255), Typeface.NORMAL), params(-1, -2, 5)); content.addView(box);
        box.setAlpha(0f); box.setTranslationY(dp(18)); box.animate().alpha(1f).translationY(0f).setDuration(420).start();
    }

    private void addRecent(int limit) {
        JSONArray list = accountData == null ? null : accountData.optJSONArray("remittances");
        if (list == null || list.length() == 0) {
            LinearLayout empty = card(); TextView icon = text("↗", 25, BLUE, Typeface.BOLD); icon.setGravity(Gravity.CENTER); empty.addView(icon);
            TextView title = text("Todavía no tienes remesas", 16, INK, Typeface.BOLD); title.setGravity(Gravity.CENTER); empty.addView(title, params(-1, -2, 8));
            TextView detail = text("Tu actividad aparecerá aquí después del primer envío.", 13, MUTED, Typeface.NORMAL); detail.setGravity(Gravity.CENTER); empty.addView(detail, params(-1, -2, 5)); content.addView(empty); return;
        }
        for (int i = 0; i < Math.min(limit, list.length()); i++) {
            JSONObject tx = list.optJSONObject(i); if (tx == null) continue;
            LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL); row.setPadding(dp(15), dp(14), dp(15), dp(14)); row.setBackground(round(SURFACE, 18, LINE, 1));
            TextView badge = text(tx.optString("operator", "N").startsWith("Mon") ? "M" : "N", 16, Color.WHITE, Typeface.BOLD); badge.setGravity(Gravity.CENTER); badge.setBackground(round(tx.optString("operator").startsWith("Mon") ? RED : BLUE, 13, Color.TRANSPARENT, 0)); row.addView(badge, new LinearLayout.LayoutParams(dp(42), dp(42)));
            LinearLayout labels = column(); labels.setPadding(dp(12), 0, dp(8), 0); labels.addView(text(tx.optString("recipientName", "Destinatario"), 14, INK, Typeface.BOLD)); labels.addView(text(tx.optString("operator") + " · " + tx.optString("recipientPhone"), 11, MUTED, Typeface.NORMAL), params(-1, -2, 3)); labels.addView(text(statusLabel(tx.optString("status")), 11, statusColor(tx.optString("status")), Typeface.BOLD), params(-1, -2, 4)); row.addView(labels, new LinearLayout.LayoutParams(0, -2, 1));
            LinearLayout totals = column(); totals.setGravity(Gravity.RIGHT); totals.addView(text("-" + money(tx.optDouble("amountUSD", 0)), 14, INK, Typeface.BOLD)); totals.addView(text(String.format(Locale.US, "%,.0f HTG", tx.optDouble("amountHTG", 0)), 11, MUTED, Typeface.NORMAL), params(-2, -2, 3)); row.addView(totals); JSONObject selectedTx = tx; row.setOnClickListener(v -> receipt(selectedTx)); content.addView(row, params(-1, -2, i == 0 ? 0 : 9));
        }
    }

    private void receipt(JSONObject tx) {
        String reference = tx.optString("txId"); if (reference.isEmpty()) reference = tx.optString("id");
        new AlertDialog.Builder(this).setTitle("Detalle de remesa").setMessage(tx.optString("operator") + "\n" + tx.optString("recipientName") + " · " + tx.optString("recipientPhone") + "\n\nMonto: " + money(tx.optDouble("amountUSD", 0)) + "\nEntrega: " + String.format(Locale.US, "%,.2f HTG", tx.optDouble("amountHTG", 0)) + "\nEstado: " + statusLabel(tx.optString("status")) + "\nReferencia: " + reference).setPositiveButton("Cerrar", null).show();
    }

    private View actionTile(String icon, String title, String detail, int color, View.OnClickListener listener) {
        LinearLayout tile = column(); tile.setGravity(Gravity.CENTER_HORIZONTAL); tile.setPadding(dp(13), dp(15), dp(13), dp(12)); tile.setBackground(round(SURFACE, 22, LINE, 1));
        TextView iconView = text(icon, 24, color, Typeface.BOLD); iconView.setGravity(Gravity.CENTER); iconView.setBackground(round(Color.argb(32, Color.red(color), Color.green(color), Color.blue(color)), 16, Color.TRANSPARENT, 0));
        tile.addView(iconView, new LinearLayout.LayoutParams(dp(48), dp(48))); tile.addView(text(title, 15, INK, Typeface.BOLD), params(-2, -2, 7)); TextView d = text(detail, 11, MUTED, Typeface.NORMAL); d.setGravity(Gravity.CENTER); tile.addView(d, params(-1, -2, 4)); tile.setOnClickListener(listener); return tile;
    }

    private void section(String label) { content.addView(text(label.toUpperCase(Locale.ROOT), 12, MUTED, Typeface.BOLD), params(-1, -2, 20)); }
    private void info(String title, String detail) { LinearLayout panel = card(); panel.setBackground(round(SURFACE_ALT, 18, darkMode ? Color.rgb(52, 79, 113) : Color.rgb(203, 224, 250), 1)); panel.addView(text(title, 14, darkMode ? Color.rgb(130, 190, 255) : NAVY, Typeface.BOLD)); panel.addView(text(detail, 12, MUTED, Typeface.NORMAL), params(-1, -2, 5)); content.addView(panel, params(-1, -2, 14)); }
    private LinearLayout card() { LinearLayout panel = column(); panel.setPadding(dp(17), dp(16), dp(17), dp(16)); panel.setBackground(round(SURFACE, 20, LINE, 1)); return panel; }
    private EditText input(String hint, int type) { EditText field = new EditText(this); field.setHint(hint); field.setTextSize(15); field.setTextColor(INK); field.setHintTextColor(MUTED); field.setSingleLine(true); field.setInputType(type); field.setPadding(dp(15), 0, dp(15), 0); field.setBackground(round(SURFACE, 16, LINE, 1)); return field; }
    private Button primaryButton(String label) { Button button = new Button(this); button.setText(label); button.setTextSize(15); button.setTextColor(Color.WHITE); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); button.setBackground(round(BLUE, 14, Color.TRANSPARENT, 0)); return button; }
    private Button secondaryButton(String label) { Button button = new Button(this); button.setText(label); button.setTextSize(14); button.setTextColor(darkMode ? Color.rgb(122, 184, 255) : BLUE); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); button.setBackground(round(SURFACE, 14, LINE, 1)); return button; }
    private Button operatorButton(String label, boolean selected) { Button button = new Button(this); button.setText(label); button.setTextSize(14); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); styleOperator(button, selected); return button; }
    private void styleOperator(Button button, boolean selected) { button.setTextColor(selected ? Color.WHITE : (darkMode ? Color.rgb(122, 184, 255) : BLUE)); button.setBackground(round(selected ? BLUE : SURFACE, 14, selected ? BLUE : LINE, 1)); }

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
    private String friendly(Exception error) { String message = error.getMessage(); if (message == null || message.trim().isEmpty()) return "Ocurrió un error inesperado. Intenta nuevamente."; if (message.contains("Unable to resolve host")) return "Sin conexión a internet."; if (message.toLowerCase(Locale.ROOT).contains("timeout")) return "La operación tardó demasiado. No la repitas; revisa el historial."; return message; }
    private void errorDialog(String title, String message) { new AlertDialog.Builder(this).setTitle(title).setMessage(message).setPositiveButton("Entendido", null).show(); }
    private String statusLabel(String status) { if ("completed".equals(status)) return "COMPLETADA"; if ("failed".equals(status)) return "RECHAZADA"; if ("review".equals(status)) return "EN REVISIÓN"; if ("processing".equals(status)) return "PROCESANDO"; return "PENDIENTE"; }
    private int statusColor(String status) { if ("completed".equals(status)) return GREEN; if ("failed".equals(status)) return RED; if ("review".equals(status)) return AMBER; return BLUE; }
    private double parseAmount(String value) { try { return Double.parseDouble(value.trim()); } catch (Exception ignored) { return 0; } }
    private double round(double value) { return Math.round(value * 100d) / 100d; }
    private String money(double value) { return usd.format(value); }
    private String firstName(String name) { String trimmed = name.trim(); int split = trimmed.indexOf(' '); return split > 0 ? trimmed.substring(0, split) : trimmed; }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    private LinearLayout column() { LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); return layout; }
    private View space(int width, int height) { View view = new View(this); view.setLayoutParams(new LinearLayout.LayoutParams(width, height)); return view; }
    private TextView text(String value, float size, int color, int style) { TextView view = new TextView(this); view.setText(value); view.setTextSize(size); view.setTextColor(color); view.setTypeface(Typeface.DEFAULT, style); return view; }
    private ImageView brandImage() { ImageView image = new ImageView(this); image.setImageResource(R.drawable.hispaniolapay_mark); image.setScaleType(ImageView.ScaleType.FIT_CENTER); image.setPadding(dp(5), dp(5), dp(5), dp(5)); image.setBackground(round(SURFACE, 22, LINE, 1)); image.setContentDescription("Logo oficial de HispaniolaPay"); return image; }
    private LinearLayout.LayoutParams params(int width, int height, int top) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width, height); p.topMargin = dp(top); return p; }
    private GradientDrawable round(int color, int radius, int stroke, int strokeWidth) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); if (strokeWidth > 0) d.setStroke(dp(strokeWidth), stroke); return d; }
    private GradientDrawable roundGradient(int start, int end, int radius) { GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{start, end}); d.setCornerRadius(dp(radius)); return d; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private abstract static class SimpleWatcher implements TextWatcher { @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {} @Override public void onTextChanged(CharSequence s, int start, int before, int count) {} }
}
