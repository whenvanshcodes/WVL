package com.music.spotui.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.Rect
import android.graphics.RectF
import android.widget.RemoteViews
import app.myspoti.engine.R
import com.music.spotui.di.SongPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Unified controller for the WVL family of Android home-screen widgets:
 * - [WvlCompactWidget]: Compact 2×1 widget
 * - [NowPlayingWidget]: Standard 4×1 / 4×2 widget
 * - [WvlExpandedWidget]: Expanded 4×2 / 4×3 widget with progress and full layout
 */
object WvlWidgets {

    const val ACTION_PREVIOUS = "app.myspoti.widget.PREVIOUS"
    const val ACTION_TOGGLE = "app.myspoti.widget.TOGGLE"
    const val ACTION_NEXT = "app.myspoti.widget.NEXT"

    private data class WidgetState(
        val title: String,
        val artist: String,
        val coverUrl: String?,
        val playing: Boolean,
        val durationMs: Long,
        val positionMs: Long,
    )

    @Volatile
    private var currentState = WidgetState("", "", null, false, 0L, 0L)

    @Volatile
    private var cachedCover: Bitmap? = null

    @Volatile
    private var cachedCoverUrl: String? = null

    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val httpClient by lazy {
        OkHttpClient.Builder()
            .callTimeout(10, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Dispatches playback events (previous, play/pause, next) to [SongPlayer].
     */
    fun handleAction(action: String?) {
        when (action) {
            ACTION_PREVIOUS -> SongPlayer.previous()
            ACTION_TOGGLE -> if (SongPlayer.isPlaying()) SongPlayer.pause() else SongPlayer.play()
            ACTION_NEXT -> SongPlayer.next()
        }
    }

    /**
     * Broadcasts updated playback state to all WVL widgets on the home screen.
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
        val next = WidgetState(title, artist, coverUrl, playing, durationMs, positionMs)
        if (next == currentState) return
        currentState = next

        val app = context.applicationContext
        val manager = AppWidgetManager.getInstance(app) ?: return
        renderAll(app, manager)

        // Asynchronously load and cache cover art if changed
        if (coverUrl != null && coverUrl != cachedCoverUrl) {
            ioScope.launch {
                val bmp = runCatching {
                    httpClient.newCall(Request.Builder().url(coverUrl).build()).execute().use { r ->
                        BitmapFactory.decodeStream(r.body.byteStream())?.let { raw ->
                            val scaled = Bitmap.createScaledBitmap(raw, 200, 200, true)
                            createRoundedBitmap(scaled, 18f)
                        }
                    }
                }.getOrNull() ?: return@launch

                if (currentState.coverUrl != coverUrl) return@launch
                cachedCover = bmp
                cachedCoverUrl = coverUrl
                renderAll(app, manager)
            }
        }
    }

    /**
     * Renders all active instances of Compact, Standard, and Expanded WVL widgets.
     */
    fun renderAll(context: Context, manager: AppWidgetManager) {
        val s = currentState
        val app = context.applicationContext

        // 1. Compact Widgets (2x1)
        val compactIds = manager.getAppWidgetIds(ComponentName(app, WvlCompactWidget::class.java))
        if (compactIds.isNotEmpty()) {
            val compactViews = RemoteViews(app.packageName, R.layout.widget_wvl_compact).apply {
                setTextViewText(R.id.widget_compact_title, s.title.ifBlank { app.getString(R.string.app_name) })
                setTextViewText(R.id.widget_compact_artist, s.artist.ifBlank { "Tap to play" })
                setImageViewResource(
                    R.id.widget_compact_play,
                    if (s.playing) R.drawable.ic_pause
                    else R.drawable.ic_play
                )
                setOnClickPendingIntent(R.id.widget_compact_prev, actionIntent(app, WvlCompactWidget::class.java, ACTION_PREVIOUS, 101))
                setOnClickPendingIntent(R.id.widget_compact_play, actionIntent(app, WvlCompactWidget::class.java, ACTION_TOGGLE, 102))
                setOnClickPendingIntent(R.id.widget_compact_next, actionIntent(app, WvlCompactWidget::class.java, ACTION_NEXT, 103))
                val open = app.packageManager.getLaunchIntentForPackage(app.packageName)
                if (open != null) {
                    setOnClickPendingIntent(
                        R.id.widget_compact_root,
                        PendingIntent.getActivity(app, 104, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    )
                }
            }
            manager.updateAppWidget(compactIds, compactViews)
        }

        // 2. Standard Widgets (4x1)
        val standardIds = manager.getAppWidgetIds(ComponentName(app, NowPlayingWidget::class.java))
        if (standardIds.isNotEmpty()) {
            val standardViews = RemoteViews(app.packageName, R.layout.widget_now_playing).apply {
                setTextViewText(R.id.widget_title, s.title.ifBlank { app.getString(R.string.app_name) })
                setTextViewText(R.id.widget_artist, s.artist.ifBlank { "Tap to play" })
                val bmp = cachedCover.takeIf { cachedCoverUrl == s.coverUrl }
                if (bmp != null) {
                    setImageViewBitmap(R.id.widget_cover, bmp)
                } else {
                    setImageViewResource(R.id.widget_cover, R.drawable.widget_default_cover)
                }
                setImageViewResource(
                    R.id.widget_play,
                    if (s.playing) R.drawable.ic_pause
                    else R.drawable.ic_play
                )
                setOnClickPendingIntent(R.id.widget_previous, actionIntent(app, NowPlayingWidget::class.java, ACTION_PREVIOUS, 201))
                setOnClickPendingIntent(R.id.widget_play, actionIntent(app, NowPlayingWidget::class.java, ACTION_TOGGLE, 202))
                setOnClickPendingIntent(R.id.widget_next, actionIntent(app, NowPlayingWidget::class.java, ACTION_NEXT, 203))
                val open = app.packageManager.getLaunchIntentForPackage(app.packageName)
                if (open != null) {
                    setOnClickPendingIntent(
                        R.id.widget_root,
                        PendingIntent.getActivity(app, 204, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    )
                }
            }
            manager.updateAppWidget(standardIds, standardViews)
        }

        // 3. Expanded Widgets (4x2)
        val expandedIds = manager.getAppWidgetIds(ComponentName(app, WvlExpandedWidget::class.java))
        if (expandedIds.isNotEmpty()) {
            val expandedViews = RemoteViews(app.packageName, R.layout.widget_wvl_expanded).apply {
                setTextViewText(R.id.widget_expanded_title, s.title.ifBlank { app.getString(R.string.app_name) })
                setTextViewText(R.id.widget_expanded_artist, s.artist.ifBlank { "Tap to play music" })

                val progressText = if (s.playing) "Playing • WVL Audio" else "Paused • WVL"
                setTextViewText(R.id.widget_expanded_progress, progressText)

                val bmp = cachedCover.takeIf { cachedCoverUrl == s.coverUrl }
                if (bmp != null) {
                    setImageViewBitmap(R.id.widget_expanded_cover, bmp)
                } else {
                    setImageViewResource(R.id.widget_expanded_cover, R.drawable.widget_default_cover)
                }

                setImageViewResource(
                    R.id.widget_expanded_play,
                    if (s.playing) R.drawable.ic_pause
                    else R.drawable.ic_play
                )

                setOnClickPendingIntent(R.id.widget_expanded_prev, actionIntent(app, WvlExpandedWidget::class.java, ACTION_PREVIOUS, 301))
                setOnClickPendingIntent(R.id.widget_expanded_play, actionIntent(app, WvlExpandedWidget::class.java, ACTION_TOGGLE, 302))
                setOnClickPendingIntent(R.id.widget_expanded_next, actionIntent(app, WvlExpandedWidget::class.java, ACTION_NEXT, 303))

                val open = app.packageManager.getLaunchIntentForPackage(app.packageName)
                if (open != null) {
                    setOnClickPendingIntent(
                        R.id.widget_expanded_root,
                        PendingIntent.getActivity(app, 304, open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                    )
                }
            }
            manager.updateAppWidget(expandedIds, expandedViews)
        }
    }

    private fun actionIntent(context: Context, targetClass: Class<*>, action: String, code: Int): PendingIntent {
        return PendingIntent.getBroadcast(
            context,
            code,
            Intent(context, targetClass).setAction(action),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun createRoundedBitmap(src: Bitmap, cornerRadiusPx: Float): Bitmap {
        val output = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(output)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rect = Rect(0, 0, src.width, src.height)
        val rectF = RectF(rect)
        canvas.drawRoundRect(rectF, cornerRadiusPx, cornerRadiusPx, paint)
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(src, rect, rect, paint)
        return output
    }
}
