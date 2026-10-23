package com.music.spotui.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import app.myspoti.engine.R
import com.music.spotui.ui.theme.ElectricBlue
import com.music.spotui.ui.theme.ElectricBlueBright
import kotlin.math.sin

/**
 * Renders the custom VB waveform logo monogram.
 */
@Composable
fun VbWaveformLogo(
    modifier: Modifier = Modifier,
    tint: Color = ElectricBlue,
) {
    Image(
        painter = painterResource(R.drawable.ic_wvl_logo),
        contentDescription = "WVL VB Logo",
        modifier = modifier,
        colorFilter = ColorFilter.tint(tint)
    )
}

/**
 * Animated audio waveform visualizer reacting smoothly to playback state.
 *
 * - When [isPlaying] is true: 24-28 harmonic equalizer bars fluidly undulate with sinusoidal motion.
 * - When [isPlaying] is false: bars smoothly ease down to a calm, elegant resting baseline.
 * - Highly optimized: zero heap allocations in draw scope, hardware-accelerated Canvas.
 */
@Composable
fun WvlPlaybackWaveform(
    isPlaying: Boolean,
    modifier: Modifier = Modifier,
    barCount: Int = 24,
    maxBarHeight: Dp = 26.dp,
    minBarHeight: Dp = 4.dp,
) {
    // Easing multiplier between playing (1f) and paused (0f)
    val playProgress by animateFloatAsState(
        targetValue = if (isPlaying) 1f else 0f,
        animationSpec = tween(durationMillis = 400, easing = FastOutSlowInEasing),
        label = "waveformPlayState"
    )

    // Infinite cyclic phase driver for fluid mathematical wave propagation
    val infiniteTransition = rememberInfiniteTransition(label = "waveformCycle")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * Math.PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "waveformPhase"
    )

    Canvas(
        modifier = modifier
            .fillMaxWidth()
            .height(maxBarHeight)
    ) {
        val totalWidth = size.width
        val maxHeightPx = size.height
        val minHeightPx = minBarHeight.toPx()

        if (totalWidth <= 0 || maxHeightPx <= 0) return@Canvas

        val barSlotWidth = totalWidth / barCount
        val barWidth = (barSlotWidth * 0.55f).coerceAtLeast(2.5f)
        val cornerRadius = CornerRadius(barWidth / 2f, barWidth / 2f)

        // Gradient for active wave bars (Electric Blue to Bright Neon Blue)
        val waveBrush = Brush.verticalGradient(
            colors = listOf(
                ElectricBlueBright,
                ElectricBlue
            )
        )

        val idleBrush = Brush.verticalGradient(
            colors = listOf(
                ElectricBlue.copy(alpha = 0.45f),
                ElectricBlue.copy(alpha = 0.25f)
            )
        )

        for (i in 0 until barCount) {
            // Normalized spatial position along the bar sequence (0.0 to 1.0)
            val normalizedIndex = i.toFloat() / (barCount - 1).coerceAtLeast(1)

            // Dual sine harmonics for natural musical fluid undulation
            val harmonic1 = sin(phase + normalizedIndex * 4.0 * Math.PI).toFloat()
            val harmonic2 = sin(phase * 1.5 + normalizedIndex * 2.0 * Math.PI).toFloat() * 0.5f
            val rawWave = ((harmonic1 + harmonic2 + 1.5f) / 3f).coerceIn(0.15f, 1f)

            // Dynamic height: scales between resting baseline and animated peak based on playProgress
            val dynamicAmplitude = (maxHeightPx - minHeightPx) * rawWave * playProgress
            val barHeight = minHeightPx + dynamicAmplitude

            val left = i * barSlotWidth + (barSlotWidth - barWidth) / 2f
            val top = (maxHeightPx - barHeight) / 2f

            drawRoundRect(
                brush = if (playProgress > 0.05f) waveBrush else idleBrush,
                topLeft = Offset(left, top),
                size = Size(barWidth, barHeight),
                cornerRadius = cornerRadius
            )
        }
    }
}
