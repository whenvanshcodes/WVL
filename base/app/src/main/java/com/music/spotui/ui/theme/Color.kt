package com.music.spotui.ui.theme

import androidx.compose.ui.graphics.Color

val AppBackground: Color get() = Color.Black
val PrimarySurface = Color(0xFF0A0A0D)
val ElevatedSurface = Color(0xFF111116)
val ElectricBlue = Color(0xFF3B82F6)
val ElectricBlueBright = Color(0xFF60A5FA)
val TextPrimary = Color(0xFFF8FAFC)
val TextSecondary = Color(0xFF94A3B8)
val BorderSubtle = Color(0xFF1E293B)
val GridBackground = Color(0xFF111116)

/** The accent: electric blue (#3B82F6) by default. */
val AppPalette: Color get() = com.music.spotui.data.api.SupportReminder.accentColor
val AppAccent: Color get() = com.music.spotui.data.api.SupportReminder.accentColor