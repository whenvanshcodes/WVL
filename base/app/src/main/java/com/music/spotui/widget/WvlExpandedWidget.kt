package com.music.spotui.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

/**
 * Expanded WVL Music Widget (4×2 / 4×3):
 * Displays large album artwork, track title, artist name, progress, and playback controls.
 */
class WvlExpandedWidget : AppWidgetProvider() {

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
