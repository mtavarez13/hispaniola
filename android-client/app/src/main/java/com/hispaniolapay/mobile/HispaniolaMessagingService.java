package com.hispaniolapay.mobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.concurrent.Executors;

public final class HispaniolaMessagingService extends FirebaseMessagingService {
    static final String CHANNEL_ID = "wallet_movements";

    @Override public void onNewToken(String token) {
        getSharedPreferences("hispaniola_push", MODE_PRIVATE).edit().putString("fcmToken", token).apply();
        ApiClient api = new ApiClient(this);
        if (api.hasSession()) Executors.newSingleThreadExecutor().execute(() -> {
            try { api.registerDeviceToken(token); } catch (Exception ignored) { }
        });
    }

    @Override public void onMessageReceived(RemoteMessage message) {
        String title = "HispaniolaPay";
        String body = "Tienes una nueva notificación";
        if (message.getNotification() != null) {
            if (message.getNotification().getTitle() != null) title = message.getNotification().getTitle();
            if (message.getNotification().getBody() != null) body = message.getNotification().getBody();
        } else {
            if (message.getData().containsKey("title")) title = message.getData().get("title");
            if (message.getData().containsKey("body")) body = message.getData().get("body");
        }
        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Movimientos de billetera", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Depósitos y movimientos importantes de HispaniolaPay");
            channel.enableLights(true); channel.setLightColor(Color.rgb(16, 91, 196));
            manager.createNotificationChannel(channel);
        }
        Intent intent = new Intent(this, MainActivity.class).setAction("OPEN_NOTIFICATIONS").putExtra("openNotifications", true);
        PendingIntent pending = PendingIntent.getActivity(this, 91, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_launcher).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true).setContentIntent(pending).setDefaults(NotificationCompat.DEFAULT_ALL);
        manager.notify((int) (System.currentTimeMillis() & 0xfffffff), notification.build());
    }
}
