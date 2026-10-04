package com.hispaniolapay.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
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
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Cliente nativo. Las credenciales BenCash y la contabilidad permanecen en el servidor. */
public final class MainActivity extends Activity {
    private static final int NAVY = Color.rgb(8, 34, 75);
    private static final int BLUE = Color.rgb(16, 91, 196);
    private static final int CYAN = Color.rgb(30, 174, 219);
    private static final int GREEN = Color.rgb(11, 151, 111);
    private static final int RED = Color.rgb(210, 54, 69);
    private static final int AMBER = Color.rgb(231, 151, 31);
    private static final int INK = Color.rgb(20, 36, 62);
    private static final int MUTED = Color.rgb(99, 112, 134);
    private static final int BG = Color.rgb(244, 247, 252);
    private static final int LINE = Color.rgb(221, 228, 239);

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final NumberFormat usd = NumberFormat.getCurrencyInstance(Locale.US);
    private ApiClient api;
    private JSONObject accountData;
    private LinearLayout content;
    private String activeScreen = "Inicio";

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        Window window = getWindow();
        window.setStatusBarColor(NAVY);
        window.setNavigationBarColor(Color.WHITE);
        api = new ApiClient(this);
        if (api.hasSession()) loadAccount(true); else showLogin();
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

        TextView mark = text("H", 34, Color.WHITE, Typeface.BOLD);
        mark.setGravity(Gravity.CENTER);
        mark.setBackground(roundGradient(BLUE, CYAN, 24));
        page.addView(mark, params(dp(76), dp(76), 0));
        page.addView(text("HispaniolaPay", 29, NAVY, Typeface.BOLD), params(-2, -2, 18));
        TextView slogan = text("Tu billetera entre RD y Haití", 15, MUTED, Typeface.NORMAL);
        slogan.setGravity(Gravity.CENTER);
        page.addView(slogan, params(-1, -2, 5));

        LinearLayout panel = column();
        panel.setPadding(dp(20), dp(22), dp(20), dp(22));
        panel.setBackground(round(Color.WHITE, 20, LINE, 1));
        page.addView(panel, params(-1, -2, 30));
        panel.addView(text("Accede a tu cuenta", 21, INK, Typeface.BOLD));
        panel.addView(text("Consulta tu saldo y envía remesas en tiempo real.", 13, MUTED, Typeface.NORMAL), params(-1, -2, 5));

        EditText email = input("Correo electrónico", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
        EditText password = input("Contraseña", InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        panel.addView(email, params(-1, dp(56), 20));
        panel.addView(password, params(-1, dp(56), 12));

        Button login = primaryButton("Iniciar sesión");
        panel.addView(login, params(-1, dp(54), 18));
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
        setContentView(scroll);
    }

    private void loadAccount(boolean fullScreen) {
        if (fullScreen) showLoading("Sincronizando tu billetera…");
        executor.execute(() -> {
            try {
                accountData = api.account();
                runOnUiThread(this::showHome);
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
        double available = account.optDouble("walletBalanceUSD", 0);
        info("Equivalencias", String.format(Locale.US, "RD$ %,.2f DOP   ·   %,.0f HTG", available * rates.optDouble("dopPerUsd", 58.5), available * rates.optDouble("htgPerUsd", 132.2)));
        section("Movimientos y remesas");
        addRecent(20);
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
                runOnUiThread(() -> {
                    String txId = remittance == null ? "" : remittance.optString("txId");
                    String reference = remittance == null ? "" : remittance.optString("id");
                    String status = remittance == null ? "procesando" : remittance.optString("status", "procesando");
                    new AlertDialog.Builder(this).setTitle("¡Remesa recibida!")
                            .setMessage("Estado: " + status.toUpperCase(Locale.ROOT) + "\nReferencia: " + (txId.isEmpty() ? reference : txId) + "\n\nPuedes consultar esta operación en Historial.")
                            .setCancelable(false).setPositiveButton("Ver comprobante", (d, w) -> loadAccount(true)).show();
                });
            } catch (Exception error) {
                runOnUiThread(() -> { button.setEnabled(true); button.setText("Revisar y enviar"); errorDialog("No se completó el envío", friendly(error)); });
            }
        });
    }

    private void showHistory() { activeScreen = "Historial"; renderShell("Historial", "Tus remesas y referencias recientes"); addRecent(50); }

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
        info("Seguridad", "La app nunca recibe la clave de BenCash. Tus saldos y remesas se validan en el servidor HispaniolaPay.");
        Button refresh = secondaryButton("Actualizar información");
        refresh.setOnClickListener(v -> loadAccount(true));
        content.addView(refresh, params(-1, dp(54), 14));
        Button logout = secondaryButton("Cerrar sesión");
        logout.setTextColor(RED);
        logout.setOnClickListener(v -> new AlertDialog.Builder(this).setTitle("Cerrar sesión").setMessage("¿Deseas salir de HispaniolaPay?").setNegativeButton("Cancelar", null).setPositiveButton("Salir", (d, w) -> { api.logout(); accountData = null; showLogin(); }).show());
        content.addView(logout, params(-1, dp(54), 10));
    }

    private void renderShell(String title, String subtitle) {
        LinearLayout root = column(); root.setBackgroundColor(BG);
        LinearLayout header = column(); header.setPadding(dp(21), dp(17), dp(21), dp(17)); header.setBackground(roundGradient(NAVY, BLUE, 0));
        LinearLayout brandRow = new LinearLayout(this); brandRow.setGravity(Gravity.CENTER_VERTICAL);
        TextView logo = text("H", 18, BLUE, Typeface.BOLD); logo.setGravity(Gravity.CENTER); logo.setBackground(round(Color.WHITE, 11, Color.TRANSPARENT, 0));
        brandRow.addView(logo, new LinearLayout.LayoutParams(dp(38), dp(38))); brandRow.addView(text("  HispaniolaPay", 18, Color.WHITE, Typeface.BOLD)); header.addView(brandRow);
        header.addView(text(title, 25, Color.WHITE, Typeface.BOLD), params(-1, -2, 17)); header.addView(text(subtitle, 13, Color.rgb(211, 227, 250), Typeface.NORMAL), params(-1, -2, 4)); root.addView(header);
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); content = column(); content.setPadding(dp(18), dp(18), dp(18), dp(28)); scroll.addView(content); root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        root.addView(bottomNav(), new LinearLayout.LayoutParams(-1, dp(68))); setContentView(root);
    }

    private View bottomNav() {
        LinearLayout nav = new LinearLayout(this); nav.setGravity(Gravity.CENTER); nav.setPadding(dp(5), dp(5), dp(5), dp(5)); nav.setBackgroundColor(Color.WHITE);
        nav.addView(navButton("⌂", "Inicio", this::showHome), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("▣", "Billetera", this::showWallet), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("↗", "Enviar", this::showSend), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("≡", "Historial", this::showHistory), new LinearLayout.LayoutParams(0, -1, 1));
        nav.addView(navButton("●", "Perfil", this::showProfile), new LinearLayout.LayoutParams(0, -1, 1)); return nav;
    }

    private View navButton(String icon, String label, Runnable action) {
        LinearLayout item = column(); item.setGravity(Gravity.CENTER); boolean active = activeScreen.equals(label);
        item.addView(text(icon, 18, active ? BLUE : MUTED, Typeface.BOLD)); item.addView(text(label, 10, active ? BLUE : MUTED, active ? Typeface.BOLD : Typeface.NORMAL)); item.setOnClickListener(v -> action.run()); return item;
    }

    private void balanceCard(double balance) {
        LinearLayout box = column(); box.setPadding(dp(20), dp(19), dp(20), dp(19)); box.setBackground(roundGradient(BLUE, CYAN, 22));
        LinearLayout top = new LinearLayout(this); top.setGravity(Gravity.CENTER_VERTICAL); top.addView(text("SALDO DISPONIBLE", 12, Color.rgb(220, 240, 255), Typeface.BOLD), new LinearLayout.LayoutParams(0, -2, 1)); top.addView(text("USD", 12, Color.WHITE, Typeface.BOLD)); box.addView(top);
        box.addView(text(money(balance), 34, Color.WHITE, Typeface.BOLD), params(-1, -2, 8)); box.addView(text("Disponible para remesas", 13, Color.rgb(226, 242, 255), Typeface.NORMAL), params(-1, -2, 3)); content.addView(box);
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
            LinearLayout row = new LinearLayout(this); row.setGravity(Gravity.CENTER_VERTICAL); row.setPadding(dp(15), dp(14), dp(15), dp(14)); row.setBackground(round(Color.WHITE, 16, LINE, 1));
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
        LinearLayout tile = column(); tile.setGravity(Gravity.CENTER_HORIZONTAL); tile.setPadding(dp(13), dp(15), dp(13), dp(12)); tile.setBackground(round(Color.WHITE, 18, LINE, 1)); tile.addView(text(icon, 26, color, Typeface.BOLD)); tile.addView(text(title, 15, INK, Typeface.BOLD), params(-2, -2, 7)); TextView d = text(detail, 11, MUTED, Typeface.NORMAL); d.setGravity(Gravity.CENTER); tile.addView(d, params(-1, -2, 4)); tile.setOnClickListener(listener); return tile;
    }

    private void section(String label) { content.addView(text(label.toUpperCase(Locale.ROOT), 12, MUTED, Typeface.BOLD), params(-1, -2, 20)); }
    private void info(String title, String detail) { LinearLayout panel = card(); panel.setBackground(round(Color.rgb(234, 243, 255), 16, Color.rgb(203, 224, 250), 1)); panel.addView(text(title, 14, NAVY, Typeface.BOLD)); panel.addView(text(detail, 12, Color.rgb(65, 83, 113), Typeface.NORMAL), params(-1, -2, 5)); content.addView(panel, params(-1, -2, 14)); }
    private LinearLayout card() { LinearLayout panel = column(); panel.setPadding(dp(17), dp(16), dp(17), dp(16)); panel.setBackground(round(Color.WHITE, 17, LINE, 1)); return panel; }
    private EditText input(String hint, int type) { EditText field = new EditText(this); field.setHint(hint); field.setTextSize(15); field.setTextColor(INK); field.setHintTextColor(Color.rgb(137, 148, 165)); field.setSingleLine(true); field.setInputType(type); field.setPadding(dp(15), 0, dp(15), 0); field.setBackground(round(Color.WHITE, 14, LINE, 1)); return field; }
    private Button primaryButton(String label) { Button button = new Button(this); button.setText(label); button.setTextSize(15); button.setTextColor(Color.WHITE); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); button.setBackground(round(BLUE, 14, Color.TRANSPARENT, 0)); return button; }
    private Button secondaryButton(String label) { Button button = new Button(this); button.setText(label); button.setTextSize(14); button.setTextColor(BLUE); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); button.setBackground(round(Color.WHITE, 14, LINE, 1)); return button; }
    private Button operatorButton(String label, boolean selected) { Button button = new Button(this); button.setText(label); button.setTextSize(14); button.setAllCaps(false); button.setTypeface(Typeface.DEFAULT, Typeface.BOLD); styleOperator(button, selected); return button; }
    private void styleOperator(Button button, boolean selected) { button.setTextColor(selected ? Color.WHITE : BLUE); button.setBackground(round(selected ? BLUE : Color.WHITE, 14, selected ? BLUE : LINE, 1)); }

    private void showLoading(String label) { FrameLayout frame = new FrameLayout(this); frame.setBackgroundColor(BG); LinearLayout box = column(); box.setGravity(Gravity.CENTER); box.addView(new ProgressBar(this), new LinearLayout.LayoutParams(dp(48), dp(48))); box.addView(text(label, 14, MUTED, Typeface.BOLD), params(-2, -2, 14)); frame.addView(box, new FrameLayout.LayoutParams(-1, -1)); setContentView(frame); }
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
    private LinearLayout.LayoutParams params(int width, int height, int top) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width, height); p.topMargin = dp(top); return p; }
    private GradientDrawable round(int color, int radius, int stroke, int strokeWidth) { GradientDrawable d = new GradientDrawable(); d.setColor(color); d.setCornerRadius(dp(radius)); if (strokeWidth > 0) d.setStroke(dp(strokeWidth), stroke); return d; }
    private GradientDrawable roundGradient(int start, int end, int radius) { GradientDrawable d = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{start, end}); d.setCornerRadius(dp(radius)); return d; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }

    private abstract static class SimpleWatcher implements TextWatcher { @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {} @Override public void onTextChanged(CharSequence s, int start, int before, int count) {} }
}
