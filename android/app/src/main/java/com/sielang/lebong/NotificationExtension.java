package com.sielang.lebong;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.annotation.Keep;
import androidx.core.app.NotificationCompat;

import com.onesignal.notifications.INotification;
import com.onesignal.notifications.INotificationReceivedEvent;
import com.onesignal.notifications.INotificationServiceExtension;

@Keep
public class NotificationExtension implements INotificationServiceExtension {

    @Override
    public void onNotificationReceived(INotificationReceivedEvent event) {
        Context context = event.getContext();
        INotification osNotification = event.getNotification();

        Log.d("SI-ELANG", "🚨 MENJALANKAN FULL SCREEN INTENT PRIORITAS TINGGI...");

        // 1. CEGAH NOTIFIKASI STANDAR
        event.preventDefault();

        // 2. SIAPKAN INTENT KE MAINACTIVITY
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | 
                        Intent.FLAG_ACTIVITY_CLEAR_TOP | 
                        Intent.FLAG_ACTIVITY_SINGLE_TOP);
        
        // Tambahkan data agar React tahu ini dari notifikasi darurat
        intent.putExtra("isEmergency", true);

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        
        // Gunakan request code unik (misal: 119)
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 119, intent, pendingFlags);

        // 3. CHANNEL NOTIFIKASI (WAJIB IMPORTANCE_HIGH)
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "emergency_call_v4"; // ID baru untuk memaksa reset sistem
        Uri alarmSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    "Panggilan Darurat SI-ELANG",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setBypassDnd(true);
            channel.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .build();
            channel.setSound(alarmSound, audioAttributes);

            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }

        // 4. BUILD NOTIFIKASI (METODE WHATSAPP/TELEPON)
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(context.getApplicationInfo().icon)
                .setContentTitle(osNotification.getTitle())
                .setContentText(osNotification.getBody())
                .setPriority(NotificationCompat.PRIORITY_MAX) // Sangat Penting
                .setCategory(NotificationCompat.CATEGORY_CALL) // Diperlakukan sebagai panggilan masuk
                .setFullScreenIntent(pendingIntent, true)    // MEMAKSA LAYAR TERBUKA
                .setOngoing(true)                             // Tidak bisa di-swipe tutup
                .setSound(alarmSound)
                .setAutoCancel(true)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        // 5. TAMPILKAN
        if (notificationManager != null) {
            notificationManager.notify(119, builder.build());
        }
    }
}