package com.music.spotui.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ListeningHistoryTest {

    @Before
    fun setUp() {
        ListeningHistory.clearForTesting()
    }

    @Test
    fun testRecordObservedTrackCapturesMetadata() {
        ListeningHistory.recordObserved(
            trackUri = "spotify:track:song1",
            title = "Stargazing",
            artist = "Myles Smith",
            album = "A Minute...",
            artworkUrl = "https://example.com/art.jpg",
            durationMs = 232000L
        )

        val entries = ListeningHistory.entries
        assertEquals(1, entries.size)
        val entry = entries.first()
        assertEquals("spotify:track:song1", entry.trackUri)
        assertEquals("Stargazing", entry.title)
        assertEquals("Myles Smith", entry.artist)
        assertEquals("A Minute...", entry.album)
        assertEquals("https://example.com/art.jpg", entry.artworkUrl)
        assertEquals(HistorySource.OBSERVED, entry.source)
    }

    @Test
    fun testRecordObservedDeduplicationPreventsSpam() {
        // First play event
        ListeningHistory.recordObserved(
            trackUri = "spotify:track:song1",
            title = "Stargazing",
            artist = "Myles Smith",
            album = "A Minute...",
            artworkUrl = "https://example.com/art.jpg"
        )
        assertEquals(1, ListeningHistory.entries.size)

        // Rapid duplicate playback tick (e.g. within 15 seconds)
        ListeningHistory.recordObserved(
            trackUri = "spotify:track:song1",
            title = "Stargazing",
            artist = "Myles Smith",
            album = "A Minute...",
            artworkUrl = "https://example.com/art.jpg"
        )
        // Should NOT create duplicate entry
        assertEquals(1, ListeningHistory.entries.size)

        // Track changed to another song
        ListeningHistory.recordObserved(
            trackUri = "spotify:track:song2",
            title = "Beautiful Things",
            artist = "Benson Boone",
            album = "Fireworks & Rollerblades",
            artworkUrl = "https://example.com/art2.jpg"
        )
        assertEquals(2, ListeningHistory.entries.size)
        assertEquals("Beautiful Things", ListeningHistory.entries.first().title)
    }

    @Test
    fun testExploredAlbumsAndArtists() {
        ListeningHistory.recordObserved(trackUri = "spotify:track:t1", title = "Track 1", artist = "Daft Punk", album = "Discovery")
        ListeningHistory.recordObserved(trackUri = "spotify:track:t2", title = "Track 2", artist = "Daft Punk", album = "Discovery")
        ListeningHistory.recordObserved(trackUri = "spotify:track:t3", title = "Track 3", artist = "Justice", album = "Cross")

        val albums = ListeningHistory.getHistoryAlbums()
        val artists = ListeningHistory.getHistoryArtists()

        val daftPunkDiscovery = albums.firstOrNull { it.name == "Discovery" }
        assertNotNull(daftPunkDiscovery)
        assertEquals(2, daftPunkDiscovery?.trackCount)

        val daftPunkArtist = artists.firstOrNull { it.name == "Daft Punk" }
        assertNotNull(daftPunkArtist)
        assertEquals(2, daftPunkArtist?.trackCount)
    }

    @Test
    fun testBuildAtlasGraphFromHistory() {
        ListeningHistory.recordObserved(trackUri = "spotify:track:t1", title = "Track 1", artist = "Radiohead", album = "OK Computer")

        val graph = ListeningHistory.buildAtlasGraph()
        val nodes = graph.first
        val edges = graph.second

        // Track, Album, Artist
        assertTrue(nodes.any { it.type == AtlasNodeType.TRACK && it.title == "Track 1" })
        assertTrue(nodes.any { it.type == AtlasNodeType.ALBUM && it.title == "OK Computer" })
        assertTrue(nodes.any { it.type == AtlasNodeType.ARTIST && it.title == "Radiohead" })

        // Edges should connect artist -> album, artist -> track, and album -> track
        assertEquals(3, edges.size)
        assertTrue(edges.any { it.relationship == "released" })
        assertTrue(edges.any { it.relationship == "performed" })
        assertTrue(edges.any { it.relationship == "contains" })
    }
}
