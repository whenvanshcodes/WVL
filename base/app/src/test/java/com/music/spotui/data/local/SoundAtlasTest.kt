package com.music.spotui.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class SoundAtlasTest {

    @Before
    fun setUp() {
        SoundAtlas.clear()
    }

    @Test
    fun testSeedFromEntityCreatesNodesAndEdges() {
        val related = listOf(
            Triple("Abbey Road", "spotify:album:abbey", AtlasNodeType.ALBUM),
            Triple("Hey Jude", "spotify:track:heyjude", AtlasNodeType.TRACK),
        )

        SoundAtlas.seedFromEntity(
            centerTitle = "The Beatles",
            centerUri = "spotify:artist:beatles",
            centerType = AtlasNodeType.ARTIST,
            relatedItems = related,
        )

        assertEquals(3, SoundAtlas.nodes.size)
        assertEquals(2, SoundAtlas.edges.size)
        assertNotNull(SoundAtlas.selectedNode)
        assertEquals("The Beatles", SoundAtlas.selectedNode?.title)
        assertEquals(AtlasNodeType.ARTIST, SoundAtlas.selectedNode?.type)
    }

    @Test
    fun testExpandNode() {
        val initialCenter = "Radiohead"
        SoundAtlas.seedFromEntity(
            centerTitle = initialCenter,
            centerUri = "spotify:artist:radiohead",
            centerType = AtlasNodeType.ARTIST,
            relatedItems = listOf(
                Triple("OK Computer", "spotify:album:okc", AtlasNodeType.ALBUM),
            )
        )
        assertEquals(2, SoundAtlas.nodes.size)

        val albumNode = SoundAtlas.nodes.first { it.title == "OK Computer" }
        SoundAtlas.expandNode(
            sourceNode = albumNode,
            connectedEntities = listOf(
                Triple("Paranoid Android", "spotify:track:pa", AtlasNodeType.TRACK),
                Triple("Karma Police", "spotify:track:kp", AtlasNodeType.TRACK),
            )
        )

        assertEquals(4, SoundAtlas.nodes.size)
        assertEquals(3, SoundAtlas.edges.size)
        assertTrue(SoundAtlas.nodes.any { it.title == "Karma Police" })
    }
}
