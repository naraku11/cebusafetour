package com.cebusafetour.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import io.flutter.embedding.android.FlutterActivity

class MainActivity : FlutterActivity() {
    override fun onStart() {
        super.onStart()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val manager = getSystemService(NotificationManager::class.java) ?: return

            // High-importance channel for emergency/safety alerts
            val alertsChannel = NotificationChannel(
                "cebusafetour_alerts",
                "CebuSafeTour Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Emergency alerts, safety advisories, and important notifications"
                enableVibration(true)
            }
            manager.createNotificationChannel(alertsChannel)
        }
    }
}
