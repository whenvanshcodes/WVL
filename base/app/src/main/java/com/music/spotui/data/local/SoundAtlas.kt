package com.music.spotui.data.local

import android.content.Context
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import app.myspoti.api.MediaKind
import com.music.spotui.data.api.Response
import com.music.spotui.di.Graph
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

enum class AtlasNodeType {
    ARTIST,
    ALBUM,
    TRACK,
}

data class AtlasNode(
    val id: String,
    val uri: String,
    val title: String,
    val subtitle: String = "",
    val type: AtlasNodeType,
    val artworkUrl: String = "",
    val extraInfo: String = "",
    var x: Float = 0f,
    var y: Float = 0f,
    val parentId: String? = null,
    val isExpanded: Boolean = false,
)

data class AtlasEdge(
    val sourceId: String,
    val targetId: String,
    val relationship: String,
)

/**
 * Sound Atlas 2.0 graph state and intelligent music exploration engine.
 * Fetches real Spotify relationships (Artist <-> Album <-> Track) using Myspoti APIs.
 */
object SoundAtlas {
    private const val TAG = "SoundAtlas"
    private val scope = CoroutineScope(Dispatchers.Main)

    var nodes by mutableStateOf<List<AtlasNode>>(emptyList())
        private set
    var edges by mutableStateOf<List<AtlasEdge>>(emptyList())
        private set
    var selectedNode by mutableStateOf<AtlasNode?>(null)
        private set
    var isLoading by mutableStateOf(false)
        private set

    // Focus history for backtrack exploration
    private val focusHistory = mutableListOf<String>()

    fun init(context: Context) {
        populateFromHistory()
    }

    /**
     * Populates the Sound Atlas graph directly from the user's recorded listening history.
     */
    fun populateFromHistory(): Boolean {
        val (historyNodes, historyEdges) = ListeningHistory.buildAtlasGraph()
        if (historyNodes.isNotEmpty()) {
            nodes = historyNodes
            edges = historyEdges
            selectedNode = historyNodes.firstOrNull()
            focusHistory.clear()
            selectedNode?.let { focusHistory.add(it.id) }
            return true
        }
        return false
    }

    /**
     * Seeds the Atlas graph synchronously or with provided related items.
     */
    fun seedFromEntity(
        centerTitle: String,
        centerUri: String,
        centerType: AtlasNodeType,
        artworkUrl: String = "",
        subtitle: String = "",
        relatedItems: List<Triple<String, String, AtlasNodeType>> = emptyList(), // (title, uri, type)
    ) {
        val centerId = "${centerType.name.lowercase()}:$centerUri"
        val centerNode = AtlasNode(
            id = centerId,
            uri = centerUri,
            title = centerTitle,
            subtitle = subtitle.ifBlank {
                when (centerType) {
                    AtlasNodeType.ARTIST -> "Artist"
                    AtlasNodeType.ALBUM -> "Album"
                    AtlasNodeType.TRACK -> "Track"
                }
            },
            type = centerType,
            artworkUrl = artworkUrl,
            x = 0f,
            y = 0f,
            isExpanded = relatedItems.isNotEmpty(),
        )

        val newNodes = mutableListOf(centerNode)
        val newEdges = mutableListOf<AtlasEdge>()

        val count = relatedItems.size
        val radius = when (centerType) {
            AtlasNodeType.ARTIST -> 220f
            AtlasNodeType.ALBUM -> 200f
            AtlasNodeType.TRACK -> 190f
        }

        relatedItems.forEachIndexed { index, (relTitle, relUri, relType) ->
            val angle = (2 * Math.PI * index / count.coerceAtLeast(1)).toFloat()
            val nodeId = "${relType.name.lowercase()}:$relUri"
            val node = AtlasNode(
                id = nodeId,
                uri = relUri,
                title = relTitle,
                subtitle = when (relType) {
                    AtlasNodeType.TRACK -> "Track"
                    AtlasNodeType.ALBUM -> "Album"
                    AtlasNodeType.ARTIST -> "Artist"
                },
                type = relType,
                artworkUrl = "",
                x = radius * cos(angle),
                y = radius * sin(angle),
                parentId = centerId,
            )
            newNodes.add(node)
            newEdges.add(
                AtlasEdge(
                    sourceId = centerId,
                    targetId = nodeId,
                    relationship = deriveRelationship(centerType, relType),
                )
            )
        }

        nodes = newNodes
        edges = newEdges
        selectedNode = centerNode
        focusHistory.clear()
        focusHistory.add(centerId)
    }

    /**
     * Expands a node by connecting related entities around it in the graph.
     */
    fun expandNode(
        sourceNode: AtlasNode,
        connectedEntities: List<Triple<String, String, AtlasNodeType>>,
    ) {
        val currentNodes = nodes.toMutableList()
        val currentEdges = edges.toMutableList()
        val existingIds = currentNodes.map { it.id }.toSet()

        val count = connectedEntities.size
        val angleStep = (2 * Math.PI / count.coerceAtLeast(1)).toFloat()
        val radius = 180f

        connectedEntities.forEachIndexed { i, (title, uri, type) ->
            val nodeId = "${type.name.lowercase()}:$uri"
            if (nodeId !in existingIds) {
                val angle = i * angleStep
                val newNode = AtlasNode(
                    id = nodeId,
                    uri = uri,
                    title = title,
                    subtitle = type.name.lowercase().replaceFirstChar { it.uppercase() },
                    type = type,
                    x = sourceNode.x + radius * kotlin.math.cos(angle),
                    y = sourceNode.y + radius * kotlin.math.sin(angle),
                    parentId = sourceNode.id
                )
                currentNodes.add(newNode)
                currentEdges.add(
                    AtlasEdge(
                        sourceId = sourceNode.id,
                        targetId = nodeId,
                        relationship = deriveRelationship(sourceNode.type, type)
                    )
                )
            }
        }

        nodes = currentNodes
        edges = currentEdges
    }

    /**
     * Seeds the Atlas graph around an Artist using real Myspoti API data.
     */
    fun seedFromArtistAsync(artistName: String, artistId: String = "") {
        if (artistName.isBlank() && artistId.isBlank()) return
        isLoading = true
        scope.launch {
            try {
                val overview = withContext(Dispatchers.IO) {
                    val resp = Graph.api.getArtistOverview(artistName, artistId).first { it !is Response.Loading }
                    (resp as? Response.Success)?.data
                }

                if (overview != null) {
                    val rootId = "artist:${overview.id.ifBlank { artistId.ifBlank { artistName } }}"
                    val rootUri = "spotify:artist:${overview.id.ifBlank { artistId }}"
                    val rootNode = AtlasNode(
                        id = rootId,
                        uri = rootUri,
                        title = overview.name,
                        subtitle = overview.monthlyListeners?.let {
                            if (it > 0) "%,d monthly listeners".format(it) else null
                        } ?: "Artist",
                        type = AtlasNodeType.ARTIST,
                        artworkUrl = overview.avatarImage.ifBlank { overview.headerImage },
                        extraInfo = overview.biography?.take(200).orEmpty(),
                        x = 0f,
                        y = 0f,
                        isExpanded = true,
                    )

                    val newNodes = mutableListOf(rootNode)
                    val newEdges = mutableListOf<AtlasEdge>()

                    // Top Tracks ring (Orbit 1)
                    val tracks = overview.topTracks.take(5)
                    val trackRadius = 180f
                    val trackCount = tracks.size
                    tracks.forEachIndexed { i, trackUi ->
                        val angle = (-Math.PI * 0.7 + (Math.PI * 1.4 * i / trackCount.coerceAtLeast(1))).toFloat()
                        val track = trackUi.song
                        val tId = "track:${track.spotifyTrackId.ifBlank { track.id.toString() }}"
                        val tUri = if (track.spotifyTrackId.isNotBlank()) "spotify:track:${track.spotifyTrackId}" else track.url
                        newNodes.add(
                            AtlasNode(
                                id = tId,
                                uri = tUri,
                                title = track.title,
                                subtitle = track.album.ifBlank { "Track" },
                                type = AtlasNodeType.TRACK,
                                artworkUrl = track.coverUri,
                                x = trackRadius * cos(angle),
                                y = trackRadius * sin(angle),
                                parentId = rootId,
                            )
                        )
                        newEdges.add(
                            AtlasEdge(
                                sourceId = rootId,
                                targetId = tId,
                                relationship = "performed",
                            )
                        )
                    }

                    // Popular Releases ring (Orbit 2)
                    val albums = overview.popularReleases.take(6)
                    val albumRadius = 290f
                    val albumCount = albums.size
                    albums.forEachIndexed { i, album ->
                        val angle = (Math.PI * 0.3 + (Math.PI * 1.4 * i / albumCount.coerceAtLeast(1))).toFloat()
                        val aId = "album:${album.spotifyId}"
                        val aUri = "spotify:album:${album.spotifyId}"
                        newNodes.add(
                            AtlasNode(
                                id = aId,
                                uri = aUri,
                                title = album.name,
                                subtitle = album.time.ifBlank { "Album" },
                                type = AtlasNodeType.ALBUM,
                                artworkUrl = album.coverUri,
                                x = albumRadius * cos(angle),
                                y = albumRadius * sin(angle),
                                parentId = rootId,
                            )
                        )
                        newEdges.add(
                            AtlasEdge(
                                sourceId = rootId,
                                targetId = aId,
                                relationship = "released",
                            )
                        )
                    }

                    nodes = newNodes
                    edges = newEdges
                    selectedNode = rootNode
                    focusHistory.clear()
                    focusHistory.add(rootId)
                }
            } catch (e: Exception) {
                Log.e(TAG, "seedFromArtistAsync failed", e)
            } finally {
                isLoading = false
            }
        }
    }

    /**
     * Seeds the Atlas graph around an Album using real Myspoti API data.
     */
    fun seedFromAlbumAsync(albumId: String, albumName: String = "", artist: String = "") {
        if (albumId.isBlank() && albumName.isBlank()) return
        isLoading = true
        scope.launch {
            try {
                val resolvedId = if (albumId.isNotBlank()) albumId else {
                    withContext(Dispatchers.IO) { Graph.api.resolveAlbumId(albumName, artist) }
                }

                val page = if (resolvedId != null) {
                    withContext(Dispatchers.IO) {
                        val resp = Graph.api.getAlbumPage(resolvedId).first { it !is Response.Loading }
                        (resp as? Response.Success)?.data
                    }
                } else null

                if (page != null) {
                    val albumNodeId = "album:$resolvedId"
                    val albumNode = AtlasNode(
                        id = albumNodeId,
                        uri = page.uri,
                        title = page.name,
                        subtitle = page.ownerName.ifBlank { "Album" },
                        type = AtlasNodeType.ALBUM,
                        artworkUrl = page.coverUri,
                        extraInfo = page.metaLine,
                        x = 0f,
                        y = 0f,
                        isExpanded = true,
                    )

                    val newNodes = mutableListOf(albumNode)
                    val newEdges = mutableListOf<AtlasEdge>()

                    // Artist node positioned at top (-90 degrees)
                    val artistId = page.ownerUri.substringAfterLast(':')
                    val artistNodeId = "artist:${artistId.ifBlank { page.ownerName }}"
                    val artistNode = AtlasNode(
                        id = artistNodeId,
                        uri = page.ownerUri.ifBlank { "spotify:artist:$artistId" },
                        title = page.ownerName,
                        subtitle = "Artist",
                        type = AtlasNodeType.ARTIST,
                        artworkUrl = page.ownerAvatar,
                        x = 0f,
                        y = -190f,
                        parentId = albumNodeId,
                    )
                    newNodes.add(artistNode)
                    newEdges.add(
                        AtlasEdge(
                            sourceId = artistNodeId,
                            targetId = albumNodeId,
                            relationship = "released",
                        )
                    )

                    // Track nodes in orbit
                    val tracks = page.tracks.take(8)
                    val count = tracks.size
                    val radius = 230f
                    tracks.forEachIndexed { i, track ->
                        val angle = (Math.PI * 0.1 + (Math.PI * 1.8 * i / count.coerceAtLeast(1))).toFloat()
                        val tId = "track:${track.spotifyTrackId.ifBlank { track.id.toString() }}"
                        val tUri = if (track.spotifyTrackId.isNotBlank()) "spotify:track:${track.spotifyTrackId}" else track.url
                        newNodes.add(
                            AtlasNode(
                                id = tId,
                                uri = tUri,
                                title = track.title,
                                subtitle = page.name,
                                type = AtlasNodeType.TRACK,
                                artworkUrl = track.coverUri.ifBlank { page.coverUri },
                                x = radius * cos(angle),
                                y = radius * sin(angle),
                                parentId = albumNodeId,
                            )
                        )
                        newEdges.add(
                            AtlasEdge(
                                sourceId = albumNodeId,
                                targetId = tId,
                                relationship = "contains",
                            )
                        )
                    }

                    nodes = newNodes
                    edges = newEdges
                    selectedNode = albumNode
                    focusHistory.clear()
                    focusHistory.add(albumNodeId)
                }
            } catch (e: Exception) {
                Log.e(TAG, "seedFromAlbumAsync failed", e)
            } finally {
                isLoading = false
            }
        }
    }

    /**
     * Seeds the Atlas graph around a Track.
     */
    fun seedFromTrack(
        trackTitle: String,
        trackUri: String,
        artworkUrl: String = "",
        artistName: String = "",
        artistId: String = "",
        albumTitle: String = "",
        albumId: String = "",
    ) {
        val trackId = "track:${trackUri.substringAfterLast(':')}"
        val trackNode = AtlasNode(
            id = trackId,
            uri = trackUri,
            title = trackTitle,
            subtitle = artistName.ifBlank { "Track" },
            type = AtlasNodeType.TRACK,
            artworkUrl = artworkUrl,
            x = 0f,
            y = 0f,
            isExpanded = true,
        )

        val newNodes = mutableListOf(trackNode)
        val newEdges = mutableListOf<AtlasEdge>()

        if (artistName.isNotBlank()) {
            val aId = "artist:${artistId.ifBlank { artistName.hashCode().toString() }}"
            val aUri = if (artistId.isNotBlank()) "spotify:artist:$artistId" else "spotify:artist:${artistName.hashCode()}"
            newNodes.add(
                AtlasNode(
                    id = aId,
                    uri = aUri,
                    title = artistName,
                    subtitle = "Artist",
                    type = AtlasNodeType.ARTIST,
                    artworkUrl = "",
                    x = -170f,
                    y = -60f,
                    parentId = trackId,
                )
            )
            newEdges.add(AtlasEdge(sourceId = aId, targetId = trackId, relationship = "performed"))
        }

        if (albumTitle.isNotBlank()) {
            val albId = "album:${albumId.ifBlank { albumTitle.hashCode().toString() }}"
            val albUri = if (albumId.isNotBlank()) "spotify:album:$albumId" else "spotify:album:${albumTitle.hashCode()}"
            newNodes.add(
                AtlasNode(
                    id = albId,
                    uri = albUri,
                    title = albumTitle,
                    subtitle = "Album",
                    type = AtlasNodeType.ALBUM,
                    artworkUrl = artworkUrl,
                    x = 170f,
                    y = 60f,
                    parentId = trackId,
                )
            )
            newEdges.add(AtlasEdge(sourceId = albId, targetId = trackId, relationship = "contains"))
        }

        nodes = newNodes
        edges = newEdges
        selectedNode = trackNode
        focusHistory.clear()
        focusHistory.add(trackId)
    }

    /**
     * Expands an existing node with real Spotify connected entities.
     */
    fun expandNode(sourceNode: AtlasNode) {
        if (isLoading) return
        isLoading = true

        scope.launch {
            try {
                val currentNodes = nodes.toMutableList()
                val currentEdges = edges.toMutableList()
                val existingIds = currentNodes.map { it.id }.toSet()

                val newEntities = mutableListOf<AtlasNode>()
                val newEdgeList = mutableListOf<AtlasEdge>()

                when (sourceNode.type) {
                    AtlasNodeType.ARTIST -> {
                        val artistId = sourceNode.uri.substringAfterLast(':')
                        val overview = withContext(Dispatchers.IO) {
                            val resp = Graph.api.getArtistOverview(sourceNode.title, artistId).first { it !is Response.Loading }
                            (resp as? Response.Success)?.data
                        }

                        if (overview != null) {
                            // Add popular releases
                            overview.popularReleases.take(6).forEach { alb ->
                                val id = "album:${alb.spotifyId}"
                                if (id !in existingIds) {
                                    newEntities.add(
                                        AtlasNode(
                                            id = id,
                                            uri = "spotify:album:${alb.spotifyId}",
                                            title = alb.name,
                                            subtitle = alb.time.ifBlank { "Album" },
                                            type = AtlasNodeType.ALBUM,
                                            artworkUrl = alb.coverUri,
                                            parentId = sourceNode.id,
                                        )
                                    )
                                    newEdgeList.add(AtlasEdge(sourceId = sourceNode.id, targetId = id, relationship = "released"))
                                }
                            }

                            // Add top tracks
                            overview.topTracks.take(4).forEach { t ->
                                val song = t.song
                                val id = "track:${song.spotifyTrackId.ifBlank { song.id.toString() }}"
                                if (id !in existingIds && newEntities.none { it.id == id }) {
                                    newEntities.add(
                                        AtlasNode(
                                            id = id,
                                            uri = if (song.spotifyTrackId.isNotBlank()) "spotify:track:${song.spotifyTrackId}" else song.url,
                                            title = song.title,
                                            subtitle = song.album.ifBlank { "Track" },
                                            type = AtlasNodeType.TRACK,
                                            artworkUrl = song.coverUri,
                                            parentId = sourceNode.id,
                                        )
                                    )
                                    newEdgeList.add(AtlasEdge(sourceId = sourceNode.id, targetId = id, relationship = "performed"))
                                }
                            }
                        }
                    }

                    AtlasNodeType.ALBUM -> {
                        val albumId = sourceNode.uri.substringAfterLast(':')
                        val page = withContext(Dispatchers.IO) {
                            val resp = Graph.api.getAlbumPage(albumId).first { it !is Response.Loading }
                            (resp as? Response.Success)?.data
                        }

                        if (page != null) {
                            // Add tracks
                            page.tracks.take(8).forEach { track ->
                                val id = "track:${track.spotifyTrackId.ifBlank { track.id.toString() }}"
                                if (id !in existingIds) {
                                    newEntities.add(
                                        AtlasNode(
                                            id = id,
                                            uri = if (track.spotifyTrackId.isNotBlank()) "spotify:track:${track.spotifyTrackId}" else track.url,
                                            title = track.title,
                                            subtitle = page.name,
                                            type = AtlasNodeType.TRACK,
                                            artworkUrl = track.coverUri.ifBlank { page.coverUri },
                                            parentId = sourceNode.id,
                                        )
                                    )
                                    newEdgeList.add(AtlasEdge(sourceId = sourceNode.id, targetId = id, relationship = "contains"))
                                }
                            }

                            // Add artist if missing
                            val artId = "artist:${page.ownerUri.substringAfterLast(':')}"
                            if (artId !in existingIds && page.ownerName.isNotBlank()) {
                                newEntities.add(
                                    AtlasNode(
                                        id = artId,
                                        uri = page.ownerUri,
                                        title = page.ownerName,
                                        subtitle = "Artist",
                                        type = AtlasNodeType.ARTIST,
                                        artworkUrl = page.ownerAvatar,
                                        parentId = sourceNode.id,
                                    )
                                )
                                newEdgeList.add(AtlasEdge(sourceId = artId, targetId = sourceNode.id, relationship = "released"))
                            }
                        }
                    }

                    AtlasNodeType.TRACK -> {
                        // Find track's artist or album
                        if (sourceNode.subtitle.isNotBlank()) {
                            val artistName = sourceNode.subtitle
                            val artId = "artist:${artistName.hashCode()}"
                            if (artId !in existingIds) {
                                newEntities.add(
                                    AtlasNode(
                                        id = artId,
                                        uri = "spotify:artist:${artistName.hashCode()}",
                                        title = artistName,
                                        subtitle = "Artist",
                                        type = AtlasNodeType.ARTIST,
                                        artworkUrl = "",
                                        parentId = sourceNode.id,
                                    )
                                )
                                newEdgeList.add(AtlasEdge(sourceId = artId, targetId = sourceNode.id, relationship = "performed"))
                            }
                        }
                    }
                }

                // Deterministically layout new children fanning outwards from sourceNode
                if (newEntities.isNotEmpty()) {
                    val count = newEntities.size
                    val baseAngle = if (sourceNode.x == 0f && sourceNode.y == 0f) 0.0 else atan2(sourceNode.y.toDouble(), sourceNode.x.toDouble())
                    val span = if (count <= 1) 0.0 else Math.PI * 0.75
                    val dist = 175f

                    newEntities.forEachIndexed { i, child ->
                        val angle = if (count <= 1) baseAngle else baseAngle - span / 2 + (span * i / (count - 1))
                        child.x = sourceNode.x + (dist * cos(angle)).toFloat()
                        child.y = sourceNode.y + (dist * sin(angle)).toFloat()
                    }

                    // Gentle collision resolution pass
                    resolveOverlaps(currentNodes + newEntities)

                    // Mark sourceNode as expanded
                    val updatedNodes = currentNodes.map {
                        if (it.id == sourceNode.id) it.copy(isExpanded = true) else it
                    }.toMutableList()

                    updatedNodes.addAll(newEntities)
                    currentEdges.addAll(newEdgeList)

                    nodes = updatedNodes
                    edges = currentEdges
                }
            } catch (e: Exception) {
                Log.e(TAG, "expandNode failed", e)
            } finally {
                isLoading = false
            }
        }
    }

    /**
     * Collapses child nodes that were spawned from [sourceNode].
     */
    fun collapseNode(sourceNode: AtlasNode) {
        val toRemove = mutableSetOf<String>()

        fun collectDescendants(parentId: String) {
            val children = nodes.filter { it.parentId == parentId && it.id != parentId }
            children.forEach { child ->
                toRemove.add(child.id)
                collectDescendants(child.id)
            }
        }

        collectDescendants(sourceNode.id)

        if (toRemove.isNotEmpty()) {
            nodes = nodes.filterNot { it.id in toRemove }.map {
                if (it.id == sourceNode.id) it.copy(isExpanded = false) else it
            }
            edges = edges.filterNot { it.sourceId in toRemove || it.targetId in toRemove }
            if (selectedNode?.id in toRemove) {
                selectedNode = sourceNode
            }
        }
    }

    /**
     * Collision avoidance relaxation pass to ensure no overlapping nodes.
     */
    private fun resolveOverlaps(allNodes: List<AtlasNode>) {
        val minDistance = 95f
        for (step in 0 until 5) {
            for (i in allNodes.indices) {
                for (j in i + 1 until allNodes.size) {
                    val n1 = allNodes[i]
                    val n2 = allNodes[j]
                    val dx = n2.x - n1.x
                    val dy = n2.y - n1.y
                    val dist = sqrt(dx * dx + dy * dy).coerceAtLeast(0.01f)
                    if (dist < minDistance) {
                        val push = (minDistance - dist) / 2f
                        val nx = dx / dist
                        val ny = dy / dist
                        if (n1.id != selectedNode?.id) {
                            n1.x -= nx * push
                            n1.y -= ny * push
                        }
                        if (n2.id != selectedNode?.id) {
                            n2.x += nx * push
                            n2.y += ny * push
                        }
                    }
                }
            }
        }
    }

    private fun deriveRelationship(centerType: AtlasNodeType, relType: AtlasNodeType): String = when {
        centerType == AtlasNodeType.ARTIST && relType == AtlasNodeType.ALBUM -> "released"
        centerType == AtlasNodeType.ARTIST && relType == AtlasNodeType.TRACK -> "performed"
        centerType == AtlasNodeType.ALBUM && relType == AtlasNodeType.TRACK -> "contains"
        centerType == AtlasNodeType.ALBUM && relType == AtlasNodeType.ARTIST -> "by artist"
        centerType == AtlasNodeType.TRACK && relType == AtlasNodeType.ARTIST -> "by artist"
        centerType == AtlasNodeType.TRACK && relType == AtlasNodeType.ALBUM -> "from album"
        else -> "connected to"
    }

    fun selectNode(node: AtlasNode?) {
        selectedNode = node
        if (node != null && (focusHistory.isEmpty() || focusHistory.last() != node.id)) {
            focusHistory.add(node.id)
            if (focusHistory.size > 20) focusHistory.removeAt(0)
        }
    }

    fun popFocusHistory(): AtlasNode? {
        if (focusHistory.size > 1) {
            focusHistory.removeAt(focusHistory.lastIndex) // Pop current
            val prevId = focusHistory.lastOrNull()
            val prevNode = nodes.firstOrNull { it.id == prevId }
            if (prevNode != null) {
                selectedNode = prevNode
                return prevNode
            }
        }
        return null
    }

    fun hasPreviousFocus(): Boolean = focusHistory.size > 1

    fun clear() {
        nodes = emptyList()
        edges = emptyList()
        selectedNode = null
        focusHistory.clear()
    }
}
