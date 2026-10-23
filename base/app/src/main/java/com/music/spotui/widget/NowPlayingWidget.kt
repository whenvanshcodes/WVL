package com.music.spotui.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent

/**
 * Standard WVL Music Widget (4×1 / 4×2):
 * Displays album artwork, track title, artist with waveform motif, and playback controls.
 */
class NowPlayingWidget : AppWidgetProvider() {

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

    companion object {
        /**
         * Backward compatible entrypoint used by SongPlayer.
         */
        fun show(
            context: Context,
            title: String,
            artist: String,
            coverUrl: String?,
            playing: Boolean,
            durationMs: Long = 0L,
            positionMs: Long = 0L,
        ) {
            WvlWidgets.show(context, title, artist, coverUrl, playing, durationMs, positionMs)
        }
    }
}
