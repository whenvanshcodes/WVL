package com.music.spotui.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class MusicInboxTest {

    @Before
    fun setUp() {
        MusicInbox.clearAll()
    }

    @Test
    fun testExtractUrlFromText() {
        val sample1 = "Check this out: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=12345 listen now!"
        val extracted1 = MusicInbox.extractUrl(sample1)
        assertEquals("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=12345", extracted1)

        val sample2 = "https://youtu.be/dQw4w9WgXcQ"
        assertEquals("https://youtu.be/dQw4w9WgXcQ", MusicInbox.extractUrl(sample2))

        val sample3 = "No url in this message"
        assertEquals(null, MusicInbox.extractUrl(sample3))
    }

    @Test
    fun testNormalizeUrlStripsTracking() {
        val raw = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abcdef&utm_source=share"
        val normalized = MusicInbox.normalizeUrl(raw)
        assertEquals("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", normalized)
    }

    @Test
    fun testExtractSpotifyUri() {
        val url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc"
        val uri = MusicInbox.extractSpotifyUri(url)
        assertEquals("spotify:track:4cOdK2wGLETKBW3PvgPWqT", uri)

        val albumUrl = "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3"
        assertEquals("spotify:album:1DFixLWuPkv3KT3TnV35m3", MusicInbox.extractSpotifyUri(albumUrl))

        val nonSpotify = "https://www.youtube.com/watch?v=123"
        assertEquals("", MusicInbox.extractSpotifyUri(nonSpotify))
    }

    @Test
    fun testAddLinkAndDuplicateDetection() {
        val url = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=xyz"
        val (first, isNew1) = MusicInbox.addLink(url, note = "First note")
        assertTrue(isNew1)
        assertEquals(1, MusicInbox.items.size)
        assertEquals(InboxStatus.TO_LISTEN, first.status)

        // Adding same link with different tracking params should be detected as duplicate
        val urlDuplicate = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=different"
        val (second, isNew2) = MusicInbox.addLink(urlDuplicate, note = "Second note")
        assertFalse(isNew2)
        assertEquals(1, MusicInbox.items.size)
        assertEquals(first.id, second.id)
    }

    @Test
    fun testStatusTransitionsAndNoteUpdate() {
        val (item, _) = MusicInbox.addLink("https://open.spotify.com/track/1234567890123456789012")
        assertEquals(InboxStatus.TO_LISTEN, item.status)

        MusicInbox.updateStatus(item.id, InboxStatus.LISTENING)
        assertEquals(InboxStatus.LISTENING, MusicInbox.items.first().status)

        MusicInbox.updateStatus(item.id, InboxStatus.COMPLETED)
        assertEquals(InboxStatus.COMPLETED, MusicInbox.items.first().status)

        MusicInbox.updateNote(item.id, "Loved the guitar solo")
        assertEquals("Loved the guitar solo", MusicInbox.items.first().note)
    }

    @Test
    fun testJsonSerializationRoundtrip() {
        MusicInbox.addLink("https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT", note = "Sample Note", title = "Never Gonna Give You Up", artist = "Rick Astley")
        val json = MusicInbox.writeJson()
        assertTrue(json.contains("Never Gonna Give You Up"))
        assertTrue(json.contains("Sample Note"))

        MusicInbox.clearAll()
        assertEquals(0, MusicInbox.items.size)

        MusicInbox.read(json)
        assertEquals(1, MusicInbox.items.size)
        val restored = MusicInbox.items.first()
        assertEquals("Never Gonna Give You Up", restored.title)
        assertEquals("Rick Astley", restored.artist)
        assertEquals("Sample Note", restored.note)
    }
}
