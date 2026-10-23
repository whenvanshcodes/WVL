package com.music.spotui.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

/**
 * Compact WVL Music Widget (~2×1):
 * Displays small WVL VB-waveform monogram, track title, artist name, and playback controls.
 */
class WvlCompactWidget : AppWidgetProvider() {

    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        WvlWidgets.renderAll(context, manager)
    }

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            WvlWidgets.ACTION_PREVIOUS,
            WvlWidgets.ACTION_TOGGLE,
            WvlWidgets.ACTION_NEXT -> WvlWidgets.handleAction(intent.action)
            else -> super.onReceive(context, intent)
        }
    }
}
