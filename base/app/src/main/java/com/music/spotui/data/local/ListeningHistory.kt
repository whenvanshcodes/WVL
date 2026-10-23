package com.music.spotui.data.local

import android.content.Context
import android.util.Log
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.snapshots.SnapshotStateList
import app.myspoti.api.RecentEntry
import app.myspoti.host.android.MyspotiRuntime
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import kotlin.math.cos
import kotlin.math.sin

/**
 * Origin of a listening history entry.
 */
enum class HistorySource(val label: String) {
    /** Track playback observed directly on this device during the current or previous sessions. */
    OBSERVED("Observed"),
    /** Playback imported from the user's Spotify account history across devices. */
    IMPORTED("Spotify Account"),
    /** Explicitly queued or added to history by the user. */
    MANUAL("Added");

    companion object {
        fun fromString(name: String): HistorySource =
            entries.firstOrNull { it.name.equals(name, ignoreCase = true) } ?: OBSERVED
    }
}

/**
 * Single immutable record of an observed or imported music listening event.
 */
data class ListeningHistoryEntry(
    val id: String = UUID.randomUUID().toString(),
    val trackId: String,
    val trackUri: String,
    val title: String,
    val artist: String,
    val artistId: String = "",
    val album: String = "",
    val albumId: String = "",
    val artworkUrl: String = "",
    val playedAt: Long = System.currentTimeMillis(),
    val durationMs: Long = 0L,
    val source: HistorySource = HistorySource.OBSERVED,
    val playCount: Int = 1,
)

/**
 * Summarized album found in listening history.
 */
data class HistoryAlbum(
    val id: String,
    val name: String,
    val artistName: String,
    val artworkUrl: String,
    val trackCount: Int,
    val lastPlayedAt: Long,
)

/**
 * Summarized artist found in listening history.
 */
data class HistoryArtist(
    val id: String,
    val name: String,
    val artworkUrl: String,
    val trackCount: Int,
    val lastPlayedAt: Long,
)

/**
 * Authoritative local repository for user listening history in WhenVanshListens.
 *
 * Provides:
 * - Atomic local JSON persistence (`listening_history.json`).
 * - Deduplication of rapid UI updates and repeated polling ticks.
 * - Integration with Spotify's account recents API to populate historical data.
 * - Real data generation for Sound Atlas graph (nodes & edges derived from actual history).
 */
object ListeningHistory {
    private const val TAG = "ListeningHistory"
    private const val VERSION = 1
    private const val MAX_ENTRIES = 500
    private const val MIN_SESSION_TRANSITION_MS = 15_000L // 15 seconds before counting re-listen

    private lateinit var storageFile: File
    private val lock = Any()
    private val scope = CoroutineScope(Dispatchers.IO)

    val entries: SnapshotStateList<ListeningHistoryEntry> = mutableStateListOf()

    private var lastRecordedUri: String = ""
    private var lastRecordedAt: Long = 0L

    fun init(context: Context) {
        synchronized(lock) {
            if (::storageFile.isInitialized) return
            storageFile = File(context.filesDir, "listening_history.json")
            if (storageFile.exists()) {
                runCatching { read(storageFile.readText()) }
            }
        }
    }

    /**
     * Records an observed playback transition.
     * Prevents duplicate entries on UI redraws or rapid polling by requiring either:
     * - A change in track URI, or
     * - More than [MIN_SESSION_TRANSITION_MS] elapsed since last record of the same track.
     */
    fun recordObserved(
        title: String,
        artist: String,
        album: String = "",
        trackUri: String,
        artworkUrl: String = "",
        durationMs: Long = 0L,
        artistId: String = "",
        albumId: String = "",
    ) {
        if (title.isBlank() || trackUri.isBlank()) return

        val now = System.currentTimeMillis()
        val normalizedUri = if (trackUri.startsWith("spotify:track:")) trackUri else "spotify:track:$trackUri"
        val rawTrackId = normalizedUri.substringAfterLast(':')

        synchronized(lock) {
            // Guard against duplicate records during identical playing session
            if (normalizedUri == lastRecordedUri && (now - lastRecordedAt) < MIN_SESSION_TRANSITION_MS) {
                return
            }

            lastRecordedUri = normalizedUri
            lastRecordedAt = now

            // Check if track is already the most recent entry; if so, update its timestamp
            val first = entries.firstOrNull()
            if (first != null && first.trackUri == normalizedUri && (now - first.playedAt) < 60_000L) {
                entries[0] = first.copy(
                    playedAt = now,
                    artworkUrl = artworkUrl.ifBlank { first.artworkUrl },
                    album = album.ifBlank { first.album },
                    playCount = first.playCount + 1,
                )
                persistLocked()
                return
            }

            val newEntry = ListeningHistoryEntry(
                id = UUID.randomUUID().toString(),
                trackId = rawTrackId,
                trackUri = normalizedUri,
                title = title.trim(),
                artist = artist.trim(),
                artistId = artistId,
                album = album.trim(),
                albumId = albumId,
                artworkUrl = artworkUrl,
                playedAt = now,
                durationMs = durationMs,
                source = HistorySource.OBSERVED,
            )

            entries.add(0, newEntry)
            if (entries.size > MAX_ENTRIES) {
                entries.removeAt(entries.lastIndex)
            }
            persistLocked()
        }
    }

    /**
     * Imports account-level recently played tracks from Spotify's recents API if history is sparse.
     */
    fun syncWithSpotifyRecents() {
        scope.launch {
            try {
                val page = MyspotiRuntime.api.recents.recentEntries(0, 40)
                if (page.items.isEmpty()) return@launch

                synchronized(lock) {
                    val existingUris = entries.map { it.trackUri }.toSet()
                    var addedCount = 0

                    for (item in page.items) {
                        val track = item.item ?: continue
                        val uri = track.uri
                        if (uri.isBlank() || uri in existingUris) continue

                        val rawTrackId = uri.substringAfterLast(':')
                        val entry = ListeningHistoryEntry(
                            id = UUID.randomUUID().toString(),
                            trackId = rawTrackId,
                            trackUri = uri,
                            title = track.title.orEmpty(),
                            artist = track.subtitle.orEmpty(),
                            album = "",
                            artworkUrl = track.images.firstOrNull()?.url.orEmpty(),
                            playedAt = track.playedAtMs ?: System.currentTimeMillis(),
                            source = HistorySource.IMPORTED,
                        )
                        entries.add(entry)
                        addedCount++
                    }

                    if (addedCount > 0) {
                        // Sort newest first
                        val sorted = entries.sortedByDescending { it.playedAt }.take(MAX_ENTRIES)
                        entries.clear()
                        entries.addAll(sorted)
                        persistLocked()
                        Log.i(TAG, "Imported $addedCount historical tracks from Spotify recents.")
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Spotify recents sync skipped: ${e.message}")
            }
        }
    }

    /**
     * Unique albums derived from true listening history.
     */
    fun getHistoryAlbums(): List<HistoryAlbum> = synchronized(lock) {
        entries
            .filter { it.album.isNotBlank() }
            .groupBy { it.album }
            .map { (albumName, list) ->
                val sample = list.first()
                HistoryAlbum(
                    id = sample.albumId.ifBlank { albumName },
                    name = albumName,
                    artistName = sample.artist,
                    artworkUrl = sample.artworkUrl,
                    trackCount = list.map { it.trackId }.distinct().size,
                    lastPlayedAt = list.maxOf { it.playedAt },
                )
            }
            .sortedByDescending { it.lastPlayedAt }
    }

    /**
     * Unique artists derived from true listening history.
     */
    fun getHistoryArtists(): List<HistoryArtist> = synchronized(lock) {
        entries
            .filter { it.artist.isNotBlank() }
            .groupBy { it.artist }
            .map { (artistName, list) ->
                val sample = list.first()
                HistoryArtist(
                    id = sample.artistId.ifBlank { artistName },
                    name = artistName,
                    artworkUrl = sample.artworkUrl,
                    trackCount = list.map { it.trackId }.distinct().size,
                    lastPlayedAt = list.maxOf { it.playedAt },
                )
            }
            .sortedByDescending { it.lastPlayedAt }
    }

    /**
     * Builds Sound Atlas nodes and edges strictly from the user's real listening history.
     */
    fun buildAtlasGraph(): Pair<List<AtlasNode>, List<AtlasEdge>> = synchronized(lock) {
        if (entries.isEmpty()) return emptyList<AtlasNode>() to emptyList()

        val recentEntries = entries.take(30)
        val nodes = mutableListOf<AtlasNode>()
        val edges = mutableListOf<AtlasEdge>()

        // 1. Gather distinct artists from history
        val topArtists = getHistoryArtists().take(6)
        val artistRadius = 260f
        val artistAngleStep = (2 * Math.PI / topArtists.size.coerceAtLeast(1)).toFloat()

        val artistNodeMap = mutableMapOf<String, AtlasNode>()

        topArtists.forEachIndexed { i, artist ->
            val angle = i * artistAngleStep
            val aId = "artist:${artist.name}"
            val aNode = AtlasNode(
                id = aId,
                uri = "spotify:artist:${artist.id}",
                title = artist.name,
                subtitle = "${artist.trackCount} tracks in history",
                type = AtlasNodeType.ARTIST,
                artworkUrl = artist.artworkUrl,
                x = artistRadius * cos(angle),
                y = artistRadius * sin(angle),
            )
            artistNodeMap[artist.name] = aNode
            nodes.add(aNode)
        }

        // 2. Gather distinct albums from history
        val topAlbums = getHistoryAlbums().take(8)
        val albumRadius = 400f
        val albumAngleStep = (2 * Math.PI / topAlbums.size.coerceAtLeast(1)).toFloat()
        val albumNodeMap = mutableMapOf<String, AtlasNode>()

        topAlbums.forEachIndexed { i, album ->
            val angle = i * albumAngleStep + 0.35f
            val albId = "album:${album.name}"
            val albNode = AtlasNode(
                id = albId,
                uri = "spotify:album:${album.id}",
                title = album.name,
                subtitle = album.artistName,
                type = AtlasNodeType.ALBUM,
                artworkUrl = album.artworkUrl,
                x = albumRadius * cos(angle),
                y = albumRadius * sin(angle),
            )
            albumNodeMap[album.name] = albNode
            nodes.add(albNode)

            // Connect Album to its Artist if present
            artistNodeMap[album.artistName]?.let { artistNode ->
                edges.add(
                    AtlasEdge(
                        sourceId = artistNode.id,
                        targetId = albId,
                        relationship = "released",
                    )
                )
            }
        }

        // 3. Add distinct recently listened tracks
        val distinctTracks = recentEntries.distinctBy { it.trackId }.take(16)
        val trackRadius = 140f
        val trackAngleStep = (2 * Math.PI / distinctTracks.size.coerceAtLeast(1)).toFloat()

        distinctTracks.forEachIndexed { i, track ->
            val angle = i * trackAngleStep
            val tId = "track:${track.trackId}"
            val tNode = AtlasNode(
                id = tId,
                uri = track.trackUri,
                title = track.title,
                subtitle = track.artist,
                type = AtlasNodeType.TRACK,
                artworkUrl = track.artworkUrl,
                x = trackRadius * cos(angle),
                y = trackRadius * sin(angle),
            )
            nodes.add(tNode)

            // Connect Track to its Artist
            artistNodeMap[track.artist]?.let { artistNode ->
                edges.add(
                    AtlasEdge(
                        sourceId = artistNode.id,
                        targetId = tId,
                        relationship = "performed",
                    )
                )
            }

            // Connect Track to its Album
            if (track.album.isNotBlank()) {
                albumNodeMap[track.album]?.let { albNode ->
                    edges.add(
                        AtlasEdge(
                            sourceId = albNode.id,
                            targetId = tId,
                            relationship = "contains",
                        )
                    )
                }
            }
        }

        return nodes to edges
    }

    fun clear() = synchronized(lock) {
        entries.clear()
        if (::storageFile.isInitialized && storageFile.exists()) {
            storageFile.delete()
        }
    }

    private fun persistLocked() {
        if (!::storageFile.isInitialized) return
        try {
            val json = JSONObject()
            json.put("version", VERSION)
            val array = JSONArray()
            entries.forEach { entry ->
                val o = JSONObject()
                o.put("id", entry.id)
                o.put("trackId", entry.trackId)
                o.put("trackUri", entry.trackUri)
                o.put("title", entry.title)
                o.put("artist", entry.artist)
                o.put("artistId", entry.artistId)
                o.put("album", entry.album)
                o.put("albumId", entry.albumId)
                o.put("artworkUrl", entry.artworkUrl)
                o.put("playedAt", entry.playedAt)
                o.put("durationMs", entry.durationMs)
                o.put("source", entry.source.name)
                o.put("playCount", entry.playCount)
                array.put(o)
            }
            json.put("entries", array)

            val temp = File(storageFile.parentFile, "${storageFile.name}.tmp")
            temp.writeText(json.toString(2))
            if (storageFile.exists()) storageFile.delete()
            temp.renameTo(storageFile)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to persist listening history", e)
        }
    }

    private fun read(content: String) {
        try {
            val json = JSONObject(content)
            val array = json.optJSONArray("entries") ?: return
            val loaded = mutableListOf<ListeningHistoryEntry>()
            for (i in 0 until array.length()) {
                val o = array.getJSONObject(i)
                loaded.add(
                    ListeningHistoryEntry(
                        id = o.optString("id", UUID.randomUUID().toString()),
                        trackId = o.getString("trackId"),
                        trackUri = o.getString("trackUri"),
                        title = o.getString("title"),
                        artist = o.getString("artist"),
                        artistId = o.optString("artistId", ""),
                        album = o.optString("album", ""),
                        albumId = o.optString("albumId", ""),
                        artworkUrl = o.optString("artworkUrl", ""),
                        playedAt = o.optLong("playedAt", System.currentTimeMillis()),
                        durationMs = o.optLong("durationMs", 0L),
                        source = HistorySource.fromString(o.optString("source", "OBSERVED")),
                        playCount = o.optInt("playCount", 1),
                    )
                )
            }
            entries.clear()
            entries.addAll(loaded)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read listening history", e)
        }
    }

    fun clearForTesting() {
        synchronized(lock) {
            entries.clear()
            lastRecordedUri = ""
            lastRecordedAt = 0L
        }
    }
}
