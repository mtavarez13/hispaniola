package com.hispaniolapay.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/** Native Android UI. Funds are never kept or debited on the device. */
public final class MainActivity extends Activity {
    private static final int BLUE = Color.rgb(11, 74, 162);
    private static final int NAVY = Color.rgb(6, 44, 103);
    private static final int GREEN = Color.rgb(5, 126, 87);
    private static final int BACKGROUND = Color.rgb(246, 248, 252);
    private LinearLayout content;
    private String activeScreen = "Inicio";

    @Override public void onCreate(Bundle savedInstanceState) { super.onCreate(savedInstanceState); showHome(); }

    private void showHome() {
        activeScreen = "Inicio"; render("Hola, cliente", "Tu dinero, conectado entre RD y Haití");
        card("Billetera principal", "$0.00 USD", "Saldo disponible para envíos", BLUE, null);
        card("Bolsillo de ahorro", "$0.00 USD", "Protege fondos para tus metas", GREEN, null);
        label("Acciones rápidas");
        action("Enviar a Haití", "MonCash o NatCash", v -> showSend());
        action("Recargar", "Depósito en sub-agente o banco RD", v -> showDeposit());
        action("Mover a ahorro", "Traspaso entre tus bolsillos", v -> showSavings());
        notice("Cuenta sin sincronizar", "Conecta Firebase para consultar saldos y operar con tu cuenta verificada.", v -> showConnect());
        navigation();
    }

    private void showWallet() {
        activeScreen = "Billetera"; render("Mi billetera", "Consulta tu saldo y tus movimientos");
        card("Disponible para enviar", "$0.00 USD", "≈ RD$ 0.00 · ≈ 0 HTG", BLUE, null);
        action("Enviar dinero", "A MonCash o NatCash", v -> showSend());
        action("Recargar billetera", "Efectivo en sub-agente o transferencia RD", v -> showDeposit());
        label("Movimientos recientes"); empty("Aún no hay movimientos", "Cuando Firebase esté conectado, tus depósitos y remesas aparecerán aquí."); navigation();
    }

    private void showSavings() {
        activeScreen = "Ahorro"; render("Bolsillo de ahorro", "Separa fondos para tus metas");
        card("Saldo protegido", "$0.00 USD", "Tus fondos se sincronizan de forma segura", GREEN, null);
        action("Pasar a ahorro", "Desde la billetera principal", v -> pending("Traspaso a ahorro"));
        action("Liberar a billetera", "Usa tu ahorro para un envío", v -> pending("Liberación de ahorro"));
        notice("Seguridad", "Los traspasos se confirmarán en el servidor; este teléfono no conserva saldos.", null); navigation();
    }

    private void showSend() {
        activeScreen = "Enviar"; render("Enviar a Haití", "Envía desde tu saldo disponible");
        card("Saldo disponible", "$0.00 USD", "Recarga tu billetera antes de enviar", BLUE, null);
        label("Destino"); action("MonCash", "Billetera Digicel · +509", v -> transferDialog("MonCash"));
        action("NatCash", "Billetera Natcom · +509", v -> transferDialog("NatCash"));
        notice("Operación protegida", "Cada envío requiere validación del servidor y del proveedor antes de acreditar fondos.", null); navigation();
    }

    private void showDeposit() {
        activeScreen = "Recargar"; render("Recargar billetera", "Agrega saldo desde República Dominicana");
        action("Depósito en sub-agente", "Presenta tu código de cliente en ventanilla", v -> pending("Orden de depósito"));
        action("Transferencia bancaria RD", "Banreservas, BHD o Popular", v -> pending("Reporte de transferencia"));
        notice("Acreditación", "El saldo solo se acredita después de la validación de un sub-agente o administrador.", null); navigation();
    }

    private void showConnect() {
        activeScreen = "Perfil"; render("Conectar mi cuenta", "Inicio de sesión y verificación de identidad");
        empty("Autenticación Firebase pendiente", "La interfaz es nativa. El siguiente paso conecta Firebase Auth y Firestore para cargar solo los datos de tu cuenta.");
        action("Configurar acceso", "Correo, contraseña y verificación", v -> Toast.makeText(this, "Se requiere habilitar la API segura de Firebase.", Toast.LENGTH_LONG).show());
        notice("Privacidad", "No guardamos contraseñas, balances ni claves de proveedores en el teléfono.", null); navigation();
    }

    private void render(String title, String subtitle) {
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true);
        content = new LinearLayout(this); content.setOrientation(LinearLayout.VERTICAL); content.setPadding(dp(20), dp(20), dp(20), dp(28)); content.setBackgroundColor(BACKGROUND); scroll.addView(content);
        TextView brand = text("HISPANIOLA PAY", 13, Color.WHITE, Typeface.BOLD); brand.setLetterSpacing(.12f); brand.setGravity(Gravity.CENTER_VERTICAL); brand.setPadding(dp(18), 0, dp(18), 0); brand.setBackgroundColor(NAVY); content.addView(brand, lp(-1, dp(50), 0));
        addSpace(20); content.addView(text(title, 28, Color.rgb(16, 33, 62), Typeface.BOLD)); addSpace(5); content.addView(text(subtitle, 15, Color.rgb(88, 102, 126), Typeface.NORMAL)); addSpace(18); setContentView(scroll);
    }

    private void card(String heading, String amount, String detail, int color, View.OnClickListener click) {
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(18), dp(16), dp(18), dp(16)); box.setBackgroundColor(color); box.setClickable(click != null); if (click != null) box.setOnClickListener(click);
        box.addView(text(heading, 13, Color.rgb(222, 235, 255), Typeface.BOLD)); addInto(box, text(amount, 30, Color.WHITE, Typeface.BOLD), 6); addInto(box, text(detail, 13, Color.rgb(220, 233, 248), Typeface.NORMAL), 3); content.addView(box, lp(-1, -2, 10));
    }

    private void action(String heading, String detail, View.OnClickListener listener) {
        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL); row.setGravity(Gravity.CENTER_VERTICAL); row.setPadding(dp(16), dp(13), dp(16), dp(13)); row.setBackgroundColor(Color.WHITE); row.setOnClickListener(listener);
        LinearLayout labels = new LinearLayout(this); labels.setOrientation(LinearLayout.VERTICAL); labels.addView(text(heading, 16, Color.rgb(24, 42, 72), Typeface.BOLD)); addInto(labels, text(detail, 13, Color.rgb(101, 113, 134), Typeface.NORMAL), 3); row.addView(labels, new LinearLayout.LayoutParams(0, -2, 1)); row.addView(text("›", 30, BLUE, Typeface.NORMAL)); content.addView(row, lp(-1, -2, 7));
    }

    private void notice(String heading, String detail, View.OnClickListener click) {
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setPadding(dp(16), dp(14), dp(16), dp(14)); box.setBackgroundColor(Color.rgb(232, 241, 255)); if (click != null) { box.setClickable(true); box.setOnClickListener(click); }
        box.addView(text(heading, 14, NAVY, Typeface.BOLD)); addInto(box, text(detail, 13, Color.rgb(65, 83, 113), Typeface.NORMAL), 4); content.addView(box, lp(-1, -2, 12));
    }

    private void empty(String heading, String detail) {
        LinearLayout box = new LinearLayout(this); box.setOrientation(LinearLayout.VERTICAL); box.setGravity(Gravity.CENTER); box.setPadding(dp(20), dp(26), dp(20), dp(26)); box.setBackgroundColor(Color.WHITE); box.addView(text(heading, 17, Color.rgb(40, 55, 80), Typeface.BOLD)); addInto(box, text(detail, 14, Color.rgb(100, 112, 132), Typeface.NORMAL), 7); content.addView(box, lp(-1, -2, 12));
    }

    private void label(String value) { TextView view = text(value, 14, Color.rgb(70, 86, 114), Typeface.BOLD); view.setAllCaps(true); content.addView(view, lp(-1, -2, 13)); }

    private void navigation() {
        LinearLayout nav = new LinearLayout(this); nav.setGravity(Gravity.CENTER); nav.setPadding(0, dp(12), 0, 0); nav.addView(navButton("Inicio", v -> showHome()), new LinearLayout.LayoutParams(0, -2, 1)); nav.addView(navButton("Billetera", v -> showWallet()), new LinearLayout.LayoutParams(0, -2, 1)); nav.addView(navButton("Ahorro", v -> showSavings()), new LinearLayout.LayoutParams(0, -2, 1)); nav.addView(navButton("Perfil", v -> showConnect()), new LinearLayout.LayoutParams(0, -2, 1)); content.addView(nav);
    }

    private Button navButton(String label, View.OnClickListener listener) { Button b = new Button(this); b.setText(label); b.setTextSize(11); b.setTextColor(label.equals(activeScreen) ? Color.WHITE : BLUE); b.setAllCaps(false); b.setBackgroundColor(label.equals(activeScreen) ? BLUE : Color.TRANSPARENT); b.setOnClickListener(listener); return b; }

    private void transferDialog(String operator) {
        LinearLayout form = new LinearLayout(this); form.setOrientation(LinearLayout.VERTICAL); int pad = dp(20); form.setPadding(pad, 0, pad, 0); EditText name = field("Nombre del destinatario", InputType.TYPE_CLASS_TEXT); EditText phone = field("Número haitiano (+509)", InputType.TYPE_CLASS_PHONE); EditText amount = field("Monto en USD", InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL); form.addView(name); form.addView(phone); form.addView(amount);
        new AlertDialog.Builder(this).setTitle("Enviar a " + operator).setMessage("La solicitud será validada por el servidor antes de mover fondos.").setView(form).setNegativeButton("Cancelar", null).setPositiveButton("Crear solicitud", (d, w) -> { if (name.getText().toString().trim().isEmpty() || phone.getText().toString().trim().isEmpty() || amount.getText().toString().trim().isEmpty()) Toast.makeText(this, "Completa nombre, teléfono y monto.", Toast.LENGTH_LONG).show(); else pending("Envío a " + operator); }).show();
    }

    private EditText field(String hint, int type) { EditText input = new EditText(this); input.setHint(hint); input.setInputType(type); input.setPadding(0, dp(8), 0, dp(8)); return input; }
    private void pending(String action) { new AlertDialog.Builder(this).setTitle("Solicitud pendiente").setMessage(action + " se habilitará al conectar el servicio transaccional seguro. No se debitó dinero ni se creó una remesa.").setPositiveButton("Entendido", null).show(); }
    private TextView text(String value, float size, int color, int style) { TextView v = new TextView(this); v.setText(value); v.setTextSize(size); v.setTextColor(color); v.setTypeface(Typeface.DEFAULT, style); return v; }
    private void addSpace(int height) { content.addView(new View(this), lp(-1, dp(height), 0)); }
    private void addInto(LinearLayout parent, View child, int top) { parent.addView(child, lp(-1, -2, top)); }
    private LinearLayout.LayoutParams lp(int width, int height, int top) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(width, height); p.topMargin = dp(top); return p; }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
}
