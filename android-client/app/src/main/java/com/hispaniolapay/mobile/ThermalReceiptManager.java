package com.hispaniolapay.mobile;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;
import android.os.Build;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.Charset;
import java.text.Normalizer;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

final class ThermalReceiptManager {
    static final int BLUETOOTH_PERMISSION_REQUEST = 704;
    private static final String PREFS = "hispaniola_thermal_printer";
    private static final String PRINTER_ADDRESS = "printer_address";
    private static final UUID SERIAL_PORT = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private final Activity activity;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    ThermalReceiptManager(Activity activity) { this.activity = activity; }

    void showActions(JSONObject transaction, JSONObject accountData) {
        showDetails(transaction, accountData, true);
    }

    void showDetails(JSONObject transaction, JSONObject accountData, boolean receiptEnabled) {
        String detail = buildReceipt(transaction, accountData);
        AlertDialog.Builder dialog = new AlertDialog.Builder(activity)
                .setTitle(receiptEnabled ? "Detalle y factura de transacción" : "Detalle de transacción")
                .setMessage(detail)
                .setNegativeButton("Cerrar", null);
        if (receiptEnabled) {
            dialog.setNeutralButton("Compartir PDF", (currentDialog, which) -> sharePdf(transaction, accountData));
            dialog.setPositiveButton("Imprimir Bluetooth", (currentDialog, which) -> print(transaction, accountData));
        }
        dialog.show();
    }

    void configurePrinter() { choosePrinter(null, null, false); }

    String configuredPrinterName() {
        String address = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE).getString(PRINTER_ADDRESS, "");
        if (address.isEmpty() || !hasBluetoothPermission()) return "Sin impresora configurada";
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            BluetoothDevice device = adapter == null ? null : adapter.getRemoteDevice(address);
            return device == null ? "Sin impresora configurada" : safeDeviceName(device) + " · " + address;
        } catch (Exception ignored) { return "Sin impresora configurada"; }
    }

    private void print(JSONObject transaction, JSONObject accountData) {
        if (!ensureBluetoothPermission()) return;
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null) { toast("Este dispositivo no admite Bluetooth."); return; }
        if (!adapter.isEnabled()) { toast("Activa Bluetooth para conectar la impresora."); return; }
        String address = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE).getString(PRINTER_ADDRESS, "");
        if (address.isEmpty()) { choosePrinter(transaction, accountData, true); return; }
        printToAddress(address, transaction, accountData);
    }

    private void choosePrinter(JSONObject transaction, JSONObject accountData, boolean printAfterSelection) {
        if (!ensureBluetoothPermission()) return;
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) { toast("Activa Bluetooth y vincula primero la impresora desde Ajustes del teléfono."); return; }
        Set<BluetoothDevice> bonded;
        try {
            bonded = adapter.getBondedDevices();
        } catch (SecurityException denied) {
            activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_PERMISSION_REQUEST);
            toast("Autoriza dispositivos cercanos y vuelve a seleccionar la impresora.");
            return;
        }
        if (bonded == null || bonded.isEmpty()) { toast("No hay impresoras vinculadas. Vincúlala en Ajustes > Bluetooth."); return; }
        List<BluetoothDevice> devices = new ArrayList<>(bonded);
        String[] labels = new String[devices.size()];
        for (int i = 0; i < devices.size(); i++) labels[i] = safeDeviceName(devices.get(i)) + "\n" + devices.get(i).getAddress();
        new AlertDialog.Builder(activity).setTitle("Seleccionar impresora Bluetooth").setItems(labels, (dialog, which) -> {
            BluetoothDevice selected = devices.get(which);
            activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE).edit().putString(PRINTER_ADDRESS, selected.getAddress()).apply();
            toast("Impresora guardada: " + safeDeviceName(selected));
            if (printAfterSelection && transaction != null) printToAddress(selected.getAddress(), transaction, accountData);
        }).setNegativeButton("Cancelar", null).show();
    }

    private void printToAddress(String address, JSONObject transaction, JSONObject accountData) {
        toast("Conectando con la impresora…");
        executor.execute(() -> {
            try {
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null) throw new Exception("Bluetooth no disponible");
                BluetoothDevice device = adapter.getRemoteDevice(address);
                try (BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SERIAL_PORT)) {
                    socket.connect();
                    OutputStream output = socket.getOutputStream();
                    output.write(new byte[]{0x1B, 0x40});
                    output.write(new byte[]{0x1B, 0x61, 0x01});
                    writeLogo(output, paperWidthMm(accountData));
                    output.write(new byte[]{0x1B, 0x45, 0x01});
                    output.write("HISPANIOLAPAY\n".getBytes(Charset.forName("US-ASCII")));
                    output.write(new byte[]{0x1B, 0x45, 0x00});
                    output.write(new byte[]{0x1B, 0x61, 0x00});
                    output.write(ascii(buildReceipt(transaction, accountData)).getBytes(Charset.forName("US-ASCII")));
                    output.write("\n\n\n".getBytes(Charset.forName("US-ASCII")));
                    output.write(new byte[]{0x1D, 0x56, 0x00});
                    output.flush();
                }
                activity.runOnUiThread(() -> toast("Factura impresa correctamente."));
            } catch (Exception error) {
                activity.runOnUiThread(() -> new AlertDialog.Builder(activity).setTitle("No se pudo imprimir")
                        .setMessage("Verifica que la impresora esté encendida, vinculada y cerca del teléfono.\n\n" + error.getMessage())
                        .setNegativeButton("Cerrar", null)
                        .setPositiveButton("Elegir otra", (dialog, which) -> choosePrinter(transaction, accountData, true)).show());
            }
        });
    }

    private void sharePdf(JSONObject transaction, JSONObject accountData) {
        executor.execute(() -> {
            try {
                File file = createPdf(transaction, accountData);
                Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".files", file);
                Intent share = new Intent(Intent.ACTION_SEND);
                share.setType("application/pdf");
                share.putExtra(Intent.EXTRA_STREAM, uri);
                share.putExtra(Intent.EXTRA_TEXT, "Comprobante de transacción HispaniolaPay");
                share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                Intent whatsapp = new Intent(share);
                whatsapp.setPackage("com.whatsapp");
                activity.runOnUiThread(() -> {
                    if (whatsapp.resolveActivity(activity.getPackageManager()) != null) activity.startActivity(whatsapp);
                    else activity.startActivity(Intent.createChooser(share, "Compartir factura PDF"));
                });
            } catch (Exception error) {
                activity.runOnUiThread(() -> toast("No se pudo generar el PDF: " + error.getMessage()));
            }
        });
    }

    private File createPdf(JSONObject transaction, JSONObject accountData) throws Exception {
        int paperWidth = paperWidthMm(accountData);
        int width = paperWidth == 78 ? 221 : 164; // milímetros a 72 dpi
        int maxChars = paperWidth == 78 ? 42 : 32;
        List<String> lines = receiptLines(transaction, accountData, maxChars);
        int height = Math.max(420, 88 + lines.size() * 13);
        PdfDocument document = new PdfDocument();
        PdfDocument.Page page = document.startPage(new PdfDocument.PageInfo.Builder(width, height, 1).create());
        Canvas canvas = page.getCanvas();
        canvas.drawColor(Color.WHITE);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setColor(Color.BLACK);
        paint.setTextSize(8.5f);
        paint.setTypeface(Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL));
        Bitmap logo = BitmapFactory.decodeResource(activity.getResources(), R.drawable.hispaniolapay_mark);
        float y = 18;
        if (logo != null) {
            int logoWidth = paperWidth == 78 ? 54 : 46;
            float left = (width - logoWidth) / 2f;
            canvas.drawBitmap(logo, null, new android.graphics.RectF(left, 8, left + logoWidth, 8 + logoWidth), paint);
            y = 70;
        }
        for (String line : lines) {
            boolean heading = line.equals("HISPANIOLAPAY") || line.startsWith("TOTAL") || line.startsWith("RECIBE");
            paint.setTypeface(Typeface.create(Typeface.MONOSPACE, heading ? Typeface.BOLD : Typeface.NORMAL));
            float textWidth = paint.measureText(line);
            float x = line.equals("HISPANIOLAPAY") ? Math.max(6, (width - textWidth) / 2f) : 7;
            canvas.drawText(line, x, y, paint);
            y += 12;
        }
        document.finishPage(page);
        File directory = new File(activity.getCacheDir(), "receipts");
        if (!directory.exists() && !directory.mkdirs()) throw new Exception("No se pudo preparar el archivo");
        String reference = reference(transaction).replaceAll("[^A-Za-z0-9_-]", "");
        File file = new File(directory, "HispaniolaPay-" + (reference.isEmpty() ? System.currentTimeMillis() : reference) + ".pdf");
        try (FileOutputStream output = new FileOutputStream(file)) { document.writeTo(output); }
        document.close();
        return file;
    }

    private String buildReceipt(JSONObject transaction, JSONObject accountData) {
        StringBuilder value = new StringBuilder();
        for (String line : receiptLines(transaction, accountData, paperWidthMm(accountData) == 78 ? 42 : 32)) value.append(line).append('\n');
        return value.toString().trim();
    }

    private List<String> receiptLines(JSONObject transaction, JSONObject accountData, int maxChars) {
        List<String> lines = new ArrayList<>();
        JSONObject account = accountData == null ? null : accountData.optJSONObject("account");
        JSONObject subAgent = accountData == null ? null : accountData.optJSONObject("subAgent");
        lines.add("HISPANIOLAPAY");
        lines.add("Hispaniola Pay SRL");
        lines.add("RNC 1-32-84910-2");
        lines.add("Tel. 809-323-3535");
        lines.add("www.hispaniolapay.com");
        lines.add("Instagram @hispaniolapay");
        lines.add(separator(maxChars));
        if (subAgent != null) {
            addWrapped(lines, "SUBAGENTE: " + subAgent.optString("name", "Socio autorizado"), maxChars);
            addWrapped(lines, "SOCIO: " + subAgent.optString("owner", ""), maxChars);
            if (!subAgent.optString("phone").isEmpty()) addWrapped(lines, "TEL: " + subAgent.optString("phone"), maxChars);
            String address = (subAgent.optString("address") + " " + subAgent.optString("municipality") + " " + subAgent.optString("province")).trim();
            if (!address.isEmpty()) addWrapped(lines, "DIR: " + address, maxChars);
            lines.add(separator(maxChars));
        }
        addWrapped(lines, "FECHA: " + displayDate(transaction.optString("createdAt")), maxChars);
        addWrapped(lines, "REFERENCIA: " + reference(transaction), maxChars);
        String title = transaction.optString("title", transaction.optString("operator", "Transaccion"));
        addWrapped(lines, "OPERACION: " + title, maxChars);
        if (!transaction.optString("productName").isEmpty()) addWrapped(lines, "SERVICIO: " + transaction.optString("productName"), maxChars);
        String issuedPin = transaction.optString("pin", transaction.optString("issuedPin", ""));
        if (!issuedPin.isEmpty()) addWrapped(lines, "PIN: " + issuedPin, maxChars);
        String direction = transaction.optString("direction", "out");
        String accountName = account == null ? "" : account.optString("name", "");
        String accountCode = account == null ? "" : account.optString("clientCode", "");
        String accountPhone = account == null ? "" : account.optString("phone", "");
        String senderName = transaction.optString("senderName", "");
        boolean incoming = "in".equals(direction);
        if (incoming && !senderName.isEmpty()) addWrapped(lines, "EMISOR: " + senderName, maxChars);
        else if (!accountName.isEmpty()) addWrapped(lines, "EMISOR: " + accountName, maxChars);
        if (!accountCode.isEmpty()) addWrapped(lines, "COD. CLIENTE: " + accountCode, maxChars);
        if (!accountPhone.isEmpty() && !incoming) addWrapped(lines, "TEL. EMISOR: " + accountPhone, maxChars);
        String recipientName = incoming ? accountName : transaction.optString("recipientName", "");
        if (!recipientName.isEmpty()) addWrapped(lines, "DESTINATARIO: " + recipientName, maxChars);
        String recipientCode = incoming ? accountCode : transaction.optString("recipientCode", "");
        if (!recipientCode.isEmpty()) addWrapped(lines, "COD. DESTINO: " + recipientCode, maxChars);
        if (!transaction.optString("recipientPhone").isEmpty()) addWrapped(lines, "CUENTA/TEL: " + transaction.optString("recipientPhone"), maxChars);
        lines.add(separator(maxChars));
        boolean providerService = transaction.has("amountDOP") && (transaction.optString("type").contains("topup") || transaction.optString("type").contains("plan") || transaction.optString("type").contains("invoice") || transaction.has("productName"));
        String currency = providerService ? "DOP" : transaction.optString("currency", transaction.optString("sourceCurrency", account == null ? "DOP" : account.optString("primaryCurrency", "DOP")));
        double amount = providerService ? transaction.optDouble("amountDOP") : (transaction.has("amount") ? transaction.optDouble("amount") : transaction.optDouble("amountUSD"));
        lines.add("MONTO: " + money(amount, currency));
        double feeAmount = providerService ? transaction.optDouble("feeDOP", 0) : transaction.optDouble("feeAmount", 0);
        if (feeAmount <= 0 && transaction.optDouble("feePercent", 0) > 0) feeAmount = amount * transaction.optDouble("feePercent") / 100d;
        if (feeAmount > 0) lines.add("TARIFA: " + money(feeAmount, currency));
        if (providerService && transaction.optDouble("totalDOP", 0) > 0) lines.add("TOTAL: " + money(transaction.optDouble("totalDOP"), "DOP"));
        if (transaction.optDouble("amountHTG", 0) > 0) lines.add(String.format(Locale.US, "RECIBE: G%,.2f HTG", transaction.optDouble("amountHTG")));
        addWrapped(lines, "ESTADO: " + transaction.optString("status", "completed").toUpperCase(Locale.ROOT), maxChars);
        lines.add(separator(maxChars));
        lines.add("Conserve este comprobante.");
        lines.add("Gracias por su preferencia.");
        return lines;
    }

    private void addWrapped(List<String> lines, String value, int maxChars) {
        String clean = value == null ? "" : value.trim();
        while (clean.length() > maxChars) {
            int cut = clean.lastIndexOf(' ', maxChars);
            if (cut < 12) cut = maxChars;
            lines.add(clean.substring(0, cut).trim());
            clean = clean.substring(cut).trim();
        }
        if (!clean.isEmpty()) lines.add(clean);
    }

    private String reference(JSONObject tx) {
        String[] keys = {"receiptCode", "txId", "referenceId", "id", "requestId"};
        for (String key : keys) { String value = tx.optString(key); if (!value.isEmpty()) return value; }
        return "SIN-REFERENCIA";
    }

    private String displayDate(String raw) {
        if (raw != null && !raw.isEmpty()) return raw.replace('T', ' ').replace("Z", " UTC");
        return new SimpleDateFormat("dd/MM/yyyy hh:mm a", Locale.getDefault()).format(new Date());
    }

    private String money(double amount, String currency) {
        String symbol = "DOP".equals(currency) ? "RD$" : "HTG".equals(currency) ? "G" : "US$";
        return String.format(Locale.US, "%s%,.2f %s", symbol, amount, currency);
    }

    private int paperWidthMm(JSONObject accountData) {
        JSONObject account = accountData == null ? null : accountData.optJSONObject("account");
        JSONObject subAgent = accountData == null ? null : accountData.optJSONObject("subAgent");
        int value = account == null ? 58 : account.optInt("receiptPaperWidthMm", 58);
        if (value != 78 && subAgent != null) value = subAgent.optInt("receiptPaperWidthMm", 58);
        return value == 78 ? 78 : 58;
    }
    private String separator(int maxChars) { StringBuilder value = new StringBuilder(); for (int i = 0; i < maxChars; i++) value.append('-'); return value.toString(); }
    private void writeLogo(OutputStream output, int paperWidth) throws Exception {
        Bitmap source = BitmapFactory.decodeResource(activity.getResources(), R.drawable.hispaniolapay_mark);
        if (source == null) return;
        int targetWidth = paperWidth == 78 ? 240 : 192;
        int targetHeight = Math.max(1, Math.round(source.getHeight() * (targetWidth / (float) source.getWidth())));
        Bitmap logo = Bitmap.createScaledBitmap(source, targetWidth, targetHeight, true);
        int bytesPerRow = (targetWidth + 7) / 8;
        output.write(new byte[]{0x1D, 0x76, 0x30, 0x00, (byte) (bytesPerRow & 0xff), (byte) ((bytesPerRow >> 8) & 0xff), (byte) (targetHeight & 0xff), (byte) ((targetHeight >> 8) & 0xff)});
        for (int y = 0; y < targetHeight; y++) {
            for (int byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
                int packed = 0;
                for (int bit = 0; bit < 8; bit++) {
                    int x = byteIndex * 8 + bit;
                    if (x < targetWidth) {
                        int color = logo.getPixel(x, y);
                        int alpha = Color.alpha(color);
                        int luminance = (Color.red(color) * 299 + Color.green(color) * 587 + Color.blue(color) * 114) / 1000;
                        if (alpha > 32 && luminance < 210) packed |= 1 << (7 - bit);
                    }
                }
                output.write(packed);
            }
        }
        output.write('\n');
        if (logo != source) logo.recycle();
    }
    private String ascii(String value) { return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "").replaceAll("[^\\x20-\\x7E\\n]", ""); }
    private boolean hasBluetoothPermission() { return Build.VERSION.SDK_INT < 31 || activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED; }
    private boolean ensureBluetoothPermission() {
        if (hasBluetoothPermission()) return true;
        activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_PERMISSION_REQUEST);
        toast("Autoriza dispositivos cercanos y vuelve a pulsar Imprimir.");
        return false;
    }
    private String safeDeviceName(BluetoothDevice device) { try { String name = device.getName(); return name == null || name.isEmpty() ? "Impresora Bluetooth" : name; } catch (SecurityException ignored) { return "Impresora Bluetooth"; } }
    private void toast(String message) { activity.runOnUiThread(() -> Toast.makeText(activity, message, Toast.LENGTH_LONG).show()); }
}
