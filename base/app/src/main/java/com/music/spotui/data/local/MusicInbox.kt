package com.music.spotui.data.local

import android.content.Context
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.snapshots.SnapshotStateList
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.URI
import java.util.UUID

enum class InboxStatus(val label: String) {
    TO_LISTEN("To Listen"),
    LISTENING("Listening"),
    COMPLETED("Completed"),
    ARCHIVED("Archived");

    companion object {
        fun fromString(value: String): InboxStatus =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) || it.label.equals(value, ignoreCase = true) }
                ?: TO_LISTEN
    }
}

data class InboxItem(
    val id: String = UUID.randomUUID().toString(),
    val originalUrl: String,
    val normalizedUrl: String,
    val savedAt: Long = System.currentTimeMillis(),
    val sourceLabel: String = "",
    val note: String = "",
    val status: InboxStatus = InboxStatus.TO_LISTEN,
    val title: String = "",
    val artist: String = "",
    val artworkUrl: String = "",
    val spotifyUri: String = "",
    val isResolved: Boolean = false,
) {
    val displayTitle: String
        get() = title.ifBlank {
            try {
                val uri = URI(normalizedUrl)
                val path = uri.path.trim('/')
                if (path.isNotBlank()) path.substringAfterLast('/') else uri.host ?: originalUrl
            } catch (e: Exception) {
                originalUrl
            }
        }

    val displaySubtitle: String
        get() = when {
            artist.isNotBlank() -> artist
            sourceLabel.isNotBlank() -> sourceLabel
            else -> try { URI(normalizedUrl).host ?: "" } catch (e: Exception) { "" }
        }
}

/**
 * Music Inbox: persistent on-device queue of music discovered anywhere (browsers, Spotify,
 * YouTube, messaging apps). Persisted atomically in private app storage.
 */
object MusicInbox {
    private const val VERSION = 1
    private lateinit var storageFile: File
    private val lock = Any()

    val items: SnapshotStateList<InboxItem> = mutableStateListOf()

    fun init(context: Context) {
        synchronized(lock) {
            if (::storageFile.isInitialized) return
            storageFile = File(context.filesDir, "music_inbox.json")
            if (storageFile.exists()) {
                runCatching { read(storageFile.readText()) }
            }
        }
    }

    /**
     * Extracts a URL from freeform text (e.g. shared text from Android Share sheet).
     */
    fun extractUrl(text: String): String? {
        val trimmed = text.trim()
        val regex = Regex("https?://[^\\s<>\"']+")
        return regex.find(trimmed)?.value ?: if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) trimmed else null
    }

    /**
     * Normalizes a URL: strips tracking query params, normalizes host & scheme.
     */
    fun normalizeUrl(rawUrl: String): String {
        return try {
            val uri = URI(rawUrl.trim())
            val scheme = (uri.scheme ?: "https").lowercase()
            val host = (uri.host ?: "").lowercase()
            val path = uri.path ?: ""
            // Strip tracking query params commonly added by social / music sharing
            val query = uri.query?.split('&')?.filterNot { param ->
                val key = param.substringBefore('=').lowercase()
                key in setOf("si", "utm_source", "utm_medium", "utm_campaign", "utm_content", "feature", "app_destination")
            }?.joinToString("&")

            val port = if (uri.port != -1 && uri.port != 80 && uri.port != 443) ":${uri.port}" else ""
            val cleanQuery = if (!query.isNullOrBlank()) "?$query" else ""
            "$scheme://$host$port$path$cleanQuery"
        } catch (e: Exception) {
            rawUrl.trim().substringBefore("?si=").substringBefore("&si=")
        }
    }

    /**
     * Resolves Spotify URI from URL if applicable.
     */
    fun extractSpotifyUri(url: String): String {
        val pattern = Regex("(?:open|www|play)\\.spotify\\.com/(?:intl-[a-z-]+/)?(track|album|playlist|artist|show|episode)/([A-Za-z0-9]{22})")
        val match = pattern.find(url) ?: return ""
        return "spotify:${match.groupValues[1]}:${match.groupValues[2]}"
    }

    /**
     * Finds an existing item by normalized URL or Spotify URI (duplicate detection).
     */
    fun findDuplicate(normalizedUrl: String, spotifyUri: String = ""): InboxItem? {
        return items.firstOrNull {
            it.normalizedUrl == normalizedUrl || (spotifyUri.isNotBlank() && it.spotifyUri == spotifyUri)
        }
    }

    /**
     * Adds a link to the inbox, detecting duplicates and preserving notes.
     */
    fun addLink(
        rawText: String,
        note: String = "",
        sourceLabel: String = "",
        title: String = "",
        artist: String = "",
        artworkUrl: String = "",
    ): Pair<InboxItem, Boolean> { // (item, isNew)
        val url = extractUrl(rawText) ?: rawText.trim()
        val normalized = normalizeUrl(url)
        val spotifyUri = extractSpotifyUri(url)

        val existing = findDuplicate(normalized, spotifyUri)
        if (existing != null) {
            // Update note or source if provided and was empty
            val updated = existing.copy(
                note = if (note.isNotBlank()) note else existing.note,
                sourceLabel = if (sourceLabel.isNotBlank()) sourceLabel else existing.sourceLabel,
                title = if (title.isNotBlank()) title else existing.title,
                artist = if (artist.isNotBlank()) artist else existing.artist,
                artworkUrl = if (artworkUrl.isNotBlank()) artworkUrl else existing.artworkUrl,
                spotifyUri = if (spotifyUri.isNotBlank()) spotifyUri else existing.spotifyUri,
            )
            updateItem(updated)
            return updated to false
        }

        val newItem = InboxItem(
            id = UUID.randomUUID().toString(),
            originalUrl = url,
            normalizedUrl = normalized,
            savedAt = System.currentTimeMillis(),
            sourceLabel = sourceLabel.ifBlank { deriveSource(url) },
            note = note,
            status = InboxStatus.TO_LISTEN,
            title = title,
            artist = artist,
            artworkUrl = artworkUrl,
            spotifyUri = spotifyUri,
            isResolved = title.isNotBlank() || spotifyUri.isNotBlank(),
        )

        synchronized(lock) {
            items.add(0, newItem)
            persistLocked()
        }
        return newItem to true
    }

    private fun deriveSource(url: String): String {
        return try {
            val host = URI(url).host?.lowercase() ?: return ""
            when {
                host.contains("spotify") -> "Spotify"
                host.contains("youtube") || host.contains("youtu.be") -> "YouTube"
                host.contains("instagram") -> "Instagram"
                host.contains("soundcloud") -> "SoundCloud"
                host.contains("apple") -> "Apple Music"
                host.contains("bandcamp") -> "Bandcamp"
                host.contains("tiktok") -> "TikTok"
                else -> host.removePrefix("www.")
            }
        } catch (e: Exception) {
            ""
        }
    }

    fun updateStatus(id: String, newStatus: InboxStatus) {
        val index = items.indexOfFirst { it.id == id }
        if (index != -1) {
            val updated = items[index].copy(status = newStatus)
            synchronized(lock) {
                items[index] = updated
                persistLocked()
            }
        }
    }

    fun updateNote(id: String, newNote: String) {
        val index = items.indexOfFirst { it.id == id }
        if (index != -1) {
            val updated = items[index].copy(note = newNote)
            synchronized(lock) {
                items[index] = updated
                persistLocked()
            }
        }
    }

    fun updateItem(updated: InboxItem) {
        val index = items.indexOfFirst { it.id == updated.id }
        if (index != -1) {
            synchronized(lock) {
                items[index] = updated
                persistLocked()
            }
        }
    }

    fun remove(id: String): InboxItem? {
        synchronized(lock) {
            val index = items.indexOfFirst { it.id == id }
            if (index != -1) {
                val removed = items.removeAt(index)
                persistLocked()
                return removed
            }
        }
        return null
    }

    fun restore(item: InboxItem, atIndex: Int = 0) {
        synchronized(lock) {
            val target = atIndex.coerceIn(0, items.size)
            items.add(target, item)
            persistLocked()
        }
    }

    fun clearAll() {
        synchronized(lock) {
            items.clear()
            persistLocked()
        }
    }

    private fun persistLocked() {
        if (!::storageFile.isInitialized) return
        val tmp = File(storageFile.parentFile, "${storageFile.name}.tmp")
        runCatching {
            tmp.writeText(writeJson())
            tmp.renameTo(storageFile)
        }
    }

    internal fun writeJson(): String {
        val root = JSONObject()
        root.put("version", VERSION)
        val array = JSONArray()
        items.forEach { item ->
            val obj = JSONObject()
                .put("id", item.id)
                .put("originalUrl", item.originalUrl)
                .put("normalizedUrl", item.normalizedUrl)
                .put("savedAt", item.savedAt)
                .put("sourceLabel", item.sourceLabel)
                .put("note", item.note)
                .put("status", item.status.name)
                .put("title", item.title)
                .put("artist", item.artist)
                .put("artworkUrl", item.artworkUrl)
                .put("spotifyUri", item.spotifyUri)
                .put("isResolved", item.isResolved)
            array.put(obj)
        }
        root.put("items", array)
        return root.toString()
    }

    internal fun read(jsonText: String) {
        val root = JSONObject(jsonText)
        if (root.optInt("version", 0) != VERSION) return
        val array = root.optJSONArray("items") ?: return
        val loaded = mutableListOf<InboxItem>()
        for (i in 0 until array.length()) {
            val obj = array.optJSONObject(i) ?: continue
            val item = InboxItem(
                id = obj.optString("id", UUID.randomUUID().toString()),
                originalUrl = obj.optString("originalUrl", ""),
                normalizedUrl = obj.optString("normalizedUrl", ""),
                savedAt = obj.optLong("savedAt", System.currentTimeMillis()),
                sourceLabel = obj.optString("sourceLabel", ""),
                note = obj.optString("note", ""),
                status = InboxStatus.fromString(obj.optString("status", "TO_LISTEN")),
                title = obj.optString("title", ""),
                artist = obj.optString("artist", ""),
                artworkUrl = obj.optString("artworkUrl", ""),
                spotifyUri = obj.optString("spotifyUri", ""),
                isResolved = obj.optBoolean("isResolved", false),
            )
            if (item.normalizedUrl.isNotBlank()) {
                loaded.add(item)
            }
        }
        items.clear()
        items.addAll(loaded)
    }
}
