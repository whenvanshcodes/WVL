package com.music.spotui.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.VectorConverter
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.automirrored.filled.PlaylistAdd
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import androidx.navigation.NavController
import com.bumptech.glide.integration.compose.CrossFade
import com.bumptech.glide.integration.compose.ExperimentalGlideComposeApi
import com.bumptech.glide.integration.compose.GlideImage
import com.music.spotui.data.api.Response
import com.music.spotui.data.entity.SearchResults
import com.music.spotui.data.local.*
import com.music.spotui.di.Graph
import com.music.spotui.di.SongPlayer
import com.music.spotui.ui.navigation.PlayerSheet
import com.music.spotui.ui.navigation.albumRoute
import com.music.spotui.ui.navigation.artistRoute
import com.music.spotui.ui.theme.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt
import kotlin.random.Random

enum class AtlasViewMode {
    HISTORY,
    MAP,
}

private enum class AtlasFilter {
    ALL,
    ARTISTS,
    ALBUMS,
    TRACKS,
}

/**
 * Sound Atlas 3.0: Personal Musical Journey & Real Listening Map.
 *
 * Backed by truthful on-device ListeningHistory and Spotify account sync.
 * Provides:
 * - Current Listening Section (now playing confirmation & open player)
 * - Chronological History View (grouped by recency, actionable play-again)
 * - Albums & Artists explored from real history
 * - Interactive 2D Galaxy Graph View generated from genuine listening records
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalGlideComposeApi::class)
@Composable
fun SoundAtlasScreen(navController: NavController) {
    val scope = rememberCoroutineScope()
    val textMeasurer = rememberTextMeasurer()
    val density = LocalDensity.current

    var viewMode by remember { mutableStateOf(AtlasViewMode.HISTORY) }
    var filter by remember { mutableStateOf(AtlasFilter.ALL) }

    // Search state
    var showSearchBar by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var isSearchingRemote by remember { mutableStateOf(false) }
    var searchResults by remember { mutableStateOf<SearchResults?>(null) }

    // Camera 2D transform state for Map View
    val panXAnim = remember { Animatable(0f) }
    val panYAnim = remember { Animatable(0f) }
    val zoomAnim = remember { Animatable(1f) }

    val panX = panXAnim.value
    val panY = panYAnim.value
    val zoom = zoomAnim.value

    // History and Graph data
    val historyEntries = ListeningHistory.entries
    val historyAlbums = remember(historyEntries.size) { ListeningHistory.getHistoryAlbums() }
    val historyArtists = remember(historyEntries.size) { ListeningHistory.getHistoryArtists() }

    val nodes = SoundAtlas.nodes
    val edges = SoundAtlas.edges
    val selectedNode = SoundAtlas.selectedNode
    val isLoading = SoundAtlas.isLoading

    // Current playing state
    val currentSong = Graph.currentSongState
    val isPlaying = currentSong.playingState.value
    val hasActiveTrack = currentSong.title.value.isNotBlank()

    // Initialize or auto-populate graph from history if needed
    LaunchedEffect(Unit) {
        if (SoundAtlas.nodes.isEmpty()) {
            SoundAtlas.populateFromHistory()
        }
    }

    // Helper: start playback safely through authoritative SongPlayer
    fun playTrack(uri: String, title: String, artist: String, album: String, coverUri: String) {
        val trackUrl = if (uri.startsWith("spotify:track:")) uri else "spotify:track:${uri.substringAfterLast(':')}"
        SongPlayer.playSong(trackUrl)
        currentSong.updateSongState(
            coverUri = coverUri,
            title = title,
            singer = artist,
            playingState = true,
            songId = uri.hashCode() and 0x7fffffff,
            songIndex = 0,
            album = album
        )
    }

    // Smooth camera refocus helper
    fun focusOnNode(node: AtlasNode, targetZoom: Float = 1.15f) {
        scope.launch {
            panXAnim.animateTo(-node.x * targetZoom, tween(450, easing = FastOutSlowInEasing))
        }
        scope.launch {
            panYAnim.animateTo(-node.y * targetZoom, tween(450, easing = FastOutSlowInEasing))
        }
        scope.launch {
            zoomAnim.animateTo(targetZoom, tween(450, easing = FastOutSlowInEasing))
        }
    }

    fun resetCamera() {
        scope.launch { panXAnim.animateTo(0f, tween(400, easing = FastOutSlowInEasing)) }
        scope.launch { panYAnim.animateTo(0f, tween(400, easing = FastOutSlowInEasing)) }
        scope.launch { zoomAnim.animateTo(1f, tween(400, easing = FastOutSlowInEasing)) }
    }

    // Live search query effect
    LaunchedEffect(searchQuery) {
        if (searchQuery.trim().length >= 2) {
            isSearchingRemote = true
            try {
                val results = Graph.api.searchEverything(searchQuery.trim()).first { it !is Response.Loading }
                if (results is Response.Success) {
                    searchResults = results.data
                }
            } catch (_: Exception) {
            } finally {
                isSearchingRemote = false
            }
        } else {
            searchResults = null
        }
    }

    Scaffold(
        topBar = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(AppBackground)
                    .statusBarsPadding()
            ) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                text = "Sound Atlas",
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold,
                                fontSize = 19.sp,
                                letterSpacing = (-0.3).sp,
                            )
                            Text(
                                text = "Your music, your journey",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Normal,
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = { navController.popBackStack() }) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                        }
                    },
                    actions = {
                        // Toggle between History View and Map View
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = ElevatedSurface,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                            modifier = Modifier.padding(end = 4.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(3.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (viewMode == AtlasViewMode.HISTORY) ElectricBlue else Color.Transparent)
                                        .clickable { viewMode = AtlasViewMode.HISTORY }
                                        .padding(horizontal = 10.dp, vertical = 5.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.History,
                                            contentDescription = "History",
                                            tint = if (viewMode == AtlasViewMode.HISTORY) Color.Black else TextSecondary,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            "History",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (viewMode == AtlasViewMode.HISTORY) Color.Black else TextSecondary
                                        )
                                    }
                                }

                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(if (viewMode == AtlasViewMode.MAP) ElectricBlue else Color.Transparent)
                                        .clickable {
                                            viewMode = AtlasViewMode.MAP
                                            if (SoundAtlas.nodes.isEmpty()) {
                                                SoundAtlas.populateFromHistory()
                                            }
                                        }
                                        .padding(horizontal = 10.dp, vertical = 5.dp)
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Default.Hub,
                                            contentDescription = "Map",
                                            tint = if (viewMode == AtlasViewMode.MAP) Color.Black else TextSecondary,
                                            modifier = Modifier.size(14.dp)
                                        )
                                        Spacer(Modifier.width(4.dp))
                                        Text(
                                            "Map",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (viewMode == AtlasViewMode.MAP) Color.Black else TextSecondary
                                        )
                                    }
                                }
                            }
                        }

                        // Search Action
                        IconButton(onClick = { showSearchBar = !showSearchBar }) {
                            Icon(
                                imageVector = if (showSearchBar) Icons.Default.Close else Icons.Default.Search,
                                contentDescription = "Search",
                                tint = if (showSearchBar) ElectricBlue else Color.White,
                            )
                        }

                        // Sync with Spotify Recents
                        IconButton(onClick = {
                            ListeningHistory.syncWithSpotifyRecents()
                            SoundAtlas.populateFromHistory()
                        }) {
                            Icon(
                                imageVector = Icons.Default.Sync,
                                contentDescription = "Sync Recents",
                                tint = TextSecondary,
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = AppBackground),
                )

                // Search Bar Input
                AnimatedVisibility(
                    visible = showSearchBar,
                    enter = slideInVertically() + fadeIn(),
                    exit = slideOutVertically() + fadeOut(),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp)
                    ) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search artist, album or track...", color = TextSecondary, fontSize = 13.sp) },
                            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = ElectricBlue) },
                            trailingIcon = {
                                if (searchQuery.isNotEmpty()) {
                                    IconButton(onClick = { searchQuery = "" }) {
                                        Icon(Icons.Default.Clear, contentDescription = "Clear", tint = TextSecondary)
                                    }
                                }
                            },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = ElectricBlue,
                                unfocusedBorderColor = BorderSubtle,
                                focusedContainerColor = ElevatedSurface,
                                unfocusedContainerColor = ElevatedSurface,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                            ),
                            shape = RoundedCornerShape(12.dp),
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }

                // Filter Chips (in Map mode)
                if (viewMode == AtlasViewMode.MAP) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        AtlasFilter.entries.forEach { f ->
                            val isSelected = filter == f
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = if (isSelected) ElectricBlue else ElevatedSurface,
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) ElectricBlue else BorderSubtle),
                                modifier = Modifier
                                    .clip(RoundedCornerShape(20.dp))
                                    .clickable { filter = f }
                            ) {
                                Text(
                                    text = when (f) {
                                        AtlasFilter.ALL -> "All (${nodes.size})"
                                        AtlasFilter.ARTISTS -> "Artists (${nodes.count { it.type == AtlasNodeType.ARTIST }})"
                                        AtlasFilter.ALBUMS -> "Albums (${nodes.count { it.type == AtlasNodeType.ALBUM }})"
                                        AtlasFilter.TRACKS -> "Tracks (${nodes.count { it.type == AtlasNodeType.TRACK }})"
                                    },
                                    color = if (isSelected) Color.Black else TextSecondary,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp)
                                )
                            }
                        }
                    }
                }

                if (isLoading || isSearchingRemote) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth().height(2.dp),
                        color = ElectricBlue,
                        trackColor = Color.Transparent,
                    )
                } else {
                    Spacer(modifier = Modifier.height(2.dp))
                }
            }
        },
        containerColor = AppBackground,
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(AppBackground)
        ) {
            if (viewMode == AtlasViewMode.HISTORY) {
                // ── CHRONOLOGICAL LISTENING HISTORY VIEW ──
                HistoryViewContent(
                    hasActiveTrack = hasActiveTrack,
                    currentSong = currentSong,
                    isPlaying = isPlaying,
                    historyEntries = historyEntries,
                    historyAlbums = historyAlbums,
                    historyArtists = historyArtists,
                    onPlayTrack = { entry ->
                        playTrack(
                            uri = entry.trackUri,
                            title = entry.title,
                            artist = entry.artist,
                            album = entry.album,
                            coverUri = entry.artworkUrl
                        )
                    },
                    onOpenAlbum = { album ->
                        navController.navigate(albumRoute(album.name, album.artistName, album.id))
                    },
                    onOpenArtist = { artist ->
                        navController.navigate(artistRoute(artist.name, artist.id))
                    },
                    onOpenPlayer = { PlayerSheet.show() }
                )
            } else {
                // ── 2D INTERACTIVE SOUND ATLAS MAP VIEW ──
                MapViewContent(
                    nodes = nodes,
                    edges = edges,
                    selectedNode = selectedNode,
                    filter = filter,
                    panX = panX,
                    panY = panY,
                    zoom = zoom,
                    onPanZoom = { dx, dy, dZoom ->
                        val newZoom = (zoomAnim.value * dZoom).coerceIn(0.45f, 3.2f)
                        scope.launch { zoomAnim.snapTo(newZoom) }
                        scope.launch { panXAnim.snapTo(panXAnim.value + dx) }
                        scope.launch { panYAnim.snapTo(panYAnim.value + dy) }
                    },
                    onSelectNode = { node -> SoundAtlas.selectNode(node) },
                    onFocusNode = { node -> focusOnNode(node) },
                    onResetCamera = { resetCamera() },
                    onZoomIn = {
                        val newZoom = (zoom * 1.35f).coerceAtMost(3.2f)
                        scope.launch { zoomAnim.animateTo(newZoom, tween(250)) }
                    },
                    onZoomOut = {
                        val newZoom = (zoom / 1.35f).coerceAtLeast(0.45f)
                        scope.launch { zoomAnim.animateTo(newZoom, tween(250)) }
                    },
                    navController = navController,
                    onPlayNode = { node ->
                        when (node.type) {
                            AtlasNodeType.TRACK -> {
                                playTrack(node.uri, node.title, node.subtitle, "", node.artworkUrl)
                            }
                            AtlasNodeType.ALBUM -> {
                                navController.navigate(albumRoute(node.title, node.subtitle, node.uri.substringAfterLast(':')))
                            }
                            AtlasNodeType.ARTIST -> {
                                navController.navigate(artistRoute(node.title, node.uri.substringAfterLast(':')))
                            }
                        }
                    }
                )
            }

            // Search Results Dropdown Overlay
            if (showSearchBar && searchResults != null) {
                val results = searchResults!!
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .padding(top = 8.dp)
                        .heightIn(max = 380.dp)
                        .align(Alignment.TopCenter)
                        .clip(RoundedCornerShape(16.dp))
                        .background(ElevatedSurface)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
                        .zIndex(20f)
                ) {
                    LazyColumn(
                        modifier = Modifier.fillMaxWidth(),
                        contentPadding = PaddingValues(12.dp)
                    ) {
                        if (results.artists.isNotEmpty()) {
                            item {
                                Text(
                                    text = "ARTISTS",
                                    color = ElectricBlue,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(vertical = 4.dp, horizontal = 8.dp)
                                )
                            }
                            items(results.artists.take(3)) { artist ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable {
                                            SoundAtlas.seedFromArtistAsync(artist.name, artist.id)
                                            showSearchBar = false
                                            viewMode = AtlasViewMode.MAP
                                            resetCamera()
                                        }
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(CircleShape)
                                            .background(PrimarySurface)
                                    ) {
                                        if (artist.coverUri.isNotBlank()) {
                                            GlideImage(
                                                model = artist.coverUri,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                transition = CrossFade,
                                                modifier = Modifier.fillMaxSize(),
                                            )
                                        } else {
                                            Icon(Icons.Default.Person, contentDescription = null, tint = ElectricBlue, modifier = Modifier.align(Alignment.Center))
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text(artist.name, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                                        Text("Artist · Explore in Atlas", color = TextSecondary, fontSize = 11.sp)
                                    }
                                }
                            }
                        }

                        if (results.songs.isNotEmpty()) {
                            item {
                                Text(
                                    text = "TRACKS",
                                    color = ElectricBlue,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.padding(top = 8.dp, bottom = 4.dp, start = 8.dp)
                                )
                            }
                            items(results.songs.take(4)) { song ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .clickable {
                                            playTrack(
                                                uri = "spotify:track:${song.spotifyTrackId}",
                                                title = song.title,
                                                artist = song.singer,
                                                album = song.album,
                                                coverUri = song.coverUri
                                            )
                                            showSearchBar = false
                                        }
                                        .padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(36.dp)
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(PrimarySurface)
                                    ) {
                                        if (song.coverUri.isNotBlank()) {
                                            GlideImage(
                                                model = song.coverUri,
                                                contentDescription = null,
                                                contentScale = ContentScale.Crop,
                                                transition = CrossFade,
                                                modifier = Modifier.fillMaxSize(),
                                            )
                                        } else {
                                            Icon(Icons.Default.MusicNote, contentDescription = null, tint = ElectricBlue, modifier = Modifier.align(Alignment.Center))
                                        }
                                    }
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(song.title, color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(song.singer, color = TextSecondary, fontSize = 11.sp, maxLines = 1)
                                    }
                                    Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = ElectricBlue, modifier = Modifier.size(20.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Chronological Listening History screen layout with Current Listening section,
 * grouped history rows, explored albums, and discovered artists.
 */
@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun HistoryViewContent(
    hasActiveTrack: Boolean,
    currentSong: com.music.spotui.di.CurrentSongState,
    isPlaying: Boolean,
    historyEntries: List<ListeningHistoryEntry>,
    historyAlbums: List<HistoryAlbum>,
    historyArtists: List<HistoryArtist>,
    onPlayTrack: (ListeningHistoryEntry) -> Unit,
    onOpenAlbum: (HistoryAlbum) -> Unit,
    onOpenArtist: (HistoryArtist) -> Unit,
    onOpenPlayer: () -> Unit,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 32.dp)
    ) {
        // ── SECTION 1: CURRENT LISTENING CARD ──
        item {
            CurrentListeningBanner(
                hasActiveTrack = hasActiveTrack,
                currentSong = currentSong,
                isPlaying = isPlaying,
                lastEntry = historyEntries.firstOrNull(),
                onOpenPlayer = onOpenPlayer,
                onResume = {
                    if (hasActiveTrack) {
                        if (isPlaying) SongPlayer.pause() else SongPlayer.play()
                    } else historyEntries.firstOrNull()?.let { onPlayTrack(it) }
                }
            )
        }

        // ── SECTION 2: ALBUMS FROM YOUR HISTORY ──
        if (historyAlbums.isNotEmpty()) {
            item {
                SectionHeader("ALBUMS EXPLORED", "${historyAlbums.size} in your journey")
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(historyAlbums.take(10)) { album ->
                        Column(
                            modifier = Modifier
                                .width(110.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { onOpenAlbum(album) }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(110.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(ElevatedSurface)
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(12.dp))
                            ) {
                                if (album.artworkUrl.isNotBlank()) {
                                    GlideImage(
                                        model = album.artworkUrl,
                                        contentDescription = album.name,
                                        contentScale = ContentScale.Crop,
                                        transition = CrossFade,
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                } else {
                                    Icon(Icons.Default.Album, contentDescription = null, tint = ElectricBlue, modifier = Modifier.align(Alignment.Center).size(36.dp))
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(album.name, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text("${album.trackCount} tracks played", color = TextSecondary, fontSize = 11.sp, maxLines = 1)
                        }
                    }
                }
            }
        }

        // ── SECTION 3: ARTISTS IN YOUR JOURNEY ──
        if (historyArtists.isNotEmpty()) {
            item {
                Spacer(Modifier.height(10.dp))
                SectionHeader("ARTISTS IN YOUR JOURNEY", "${historyArtists.size} artists listened to")
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    items(historyArtists.take(10)) { artist ->
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .width(85.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .clickable { onOpenArtist(artist) }
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(76.dp)
                                    .clip(CircleShape)
                                    .background(ElevatedSurface)
                                    .border(1.5.dp, ElectricBlue.copy(alpha = 0.6f), CircleShape)
                            ) {
                                if (artist.artworkUrl.isNotBlank()) {
                                    GlideImage(
                                        model = artist.artworkUrl,
                                        contentDescription = artist.name,
                                        contentScale = ContentScale.Crop,
                                        transition = CrossFade,
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                } else {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = ElectricBlue, modifier = Modifier.align(Alignment.Center).size(30.dp))
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                            Text(artist.name, color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center)
                            Text("${artist.trackCount} tracks", color = TextSecondary, fontSize = 10.sp)
                        }
                    }
                }
            }
        }

        // ── SECTION 4: CHRONOLOGICAL RECENT LISTENS ──
        item {
            Spacer(Modifier.height(14.dp))
            SectionHeader("RECENT LISTENING ACTIVITY", "Newest first")
        }

        if (historyEntries.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(ElevatedSurface)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(16.dp))
                        .padding(28.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Headphones, contentDescription = null, tint = ElectricBlue, modifier = Modifier.size(44.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No listening activity recorded yet", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(4.dp))
                        Text("Play any song or tap Sync to load your recent account history.", color = TextSecondary, fontSize = 12.sp, textAlign = TextAlign.Center)
                    }
                }
            }
        } else {
            items(historyEntries, key = { it.id }) { entry ->
                HistoryTrackRow(
                    entry = entry,
                    onPlay = { onPlayTrack(entry) }
                )
            }
        }
    }
}

/**
 * Top banner showing active now-playing track or most recent session.
 */
@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun CurrentListeningBanner(
    hasActiveTrack: Boolean,
    currentSong: com.music.spotui.di.CurrentSongState,
    isPlaying: Boolean,
    lastEntry: ListeningHistoryEntry?,
    onOpenPlayer: () -> Unit,
    onResume: () -> Unit,
) {
    val title = if (hasActiveTrack) currentSong.title.value else lastEntry?.title.orEmpty()
    val artist = if (hasActiveTrack) currentSong.singer.value else lastEntry?.artist.orEmpty()
    val album = if (hasActiveTrack) currentSong.album.value else lastEntry?.album.orEmpty()
    val cover = if (hasActiveTrack) currentSong.coverUri.value else lastEntry?.artworkUrl.orEmpty()

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(18.dp))
            .border(1.dp, if (hasActiveTrack && isPlaying) ElectricBlue else BorderSubtle, RoundedCornerShape(18.dp)),
        color = ElevatedSurface,
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PrimarySurface)
                    .clickable { onOpenPlayer() }
            ) {
                if (cover.isNotBlank()) {
                    GlideImage(
                        model = cover,
                        contentDescription = title,
                        contentScale = ContentScale.Crop,
                        transition = CrossFade,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Default.MusicNote, contentDescription = null, tint = ElectricBlue, modifier = Modifier.align(Alignment.Center))
                }
            }

            Spacer(Modifier.width(14.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onOpenPlayer() }
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = if (hasActiveTrack && isPlaying) ElectricBlue.copy(alpha = 0.2f) else BorderSubtle.copy(alpha = 0.4f),
                    ) {
                        Text(
                            text = if (hasActiveTrack && isPlaying) "NOW PLAYING" else if (hasActiveTrack) "PAUSED" else "RECENTLY PLAYED",
                            color = if (hasActiveTrack && isPlaying) ElectricBlueBright else TextSecondary,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }

                Spacer(Modifier.height(4.dp))

                Text(
                    text = title.ifBlank { "No track playing" },
                    color = TextPrimary,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = listOfNotNull(artist.takeIf { it.isNotBlank() }, album.takeIf { it.isNotBlank() }).joinToString(" · "),
                    color = TextSecondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Spacer(Modifier.width(10.dp))

            IconButton(
                onClick = onResume,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(ElectricBlue)
            ) {
                Icon(
                    imageVector = if (hasActiveTrack && isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                    contentDescription = "Playback",
                    tint = Color.Black,
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
}

/**
 * Individual row in the chronological listening history list.
 */
@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun HistoryTrackRow(
    entry: ListeningHistoryEntry,
    onPlay: () -> Unit,
) {
    val timeLabel = remember(entry.playedAt) { formatRelativeTime(entry.playedAt) }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onPlay() }
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(ElevatedSurface)
                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
        ) {
            if (entry.artworkUrl.isNotBlank()) {
                GlideImage(
                    model = entry.artworkUrl,
                    contentDescription = entry.title,
                    contentScale = ContentScale.Crop,
                    transition = CrossFade,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Icon(Icons.Default.MusicNote, contentDescription = null, tint = ElectricBlue, modifier = Modifier.align(Alignment.Center))
            }
        }

        Spacer(Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = entry.title,
                color = TextPrimary,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = entry.artist,
                    color = TextSecondary,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (entry.album.isNotBlank()) {
                    Text(" · ${entry.album}", color = TextSecondary.copy(alpha = 0.7f), fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                Text(timeLabel, color = TextSecondary.copy(alpha = 0.6f), fontSize = 10.sp)
                Spacer(Modifier.width(6.dp))
                Text(
                    text = "• ${entry.source.label}",
                    color = if (entry.source == HistorySource.OBSERVED) ElectricBlueBright.copy(alpha = 0.8f) else TextSecondary.copy(alpha = 0.5f),
                    fontSize = 10.sp
                )
            }
        }

        IconButton(onClick = onPlay, modifier = Modifier.size(36.dp)) {
            Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = ElectricBlue, modifier = Modifier.size(22.dp))
        }
    }
}

/**
 * 2D Interactive Galaxy Canvas view with real node inspection.
 */
@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun MapViewContent(
    nodes: List<AtlasNode>,
    edges: List<AtlasEdge>,
    selectedNode: AtlasNode?,
    filter: AtlasFilter,
    panX: Float,
    panY: Float,
    zoom: Float,
    onPanZoom: (Float, Float, Float) -> Unit,
    onSelectNode: (AtlasNode?) -> Unit,
    onFocusNode: (AtlasNode) -> Unit,
    onResetCamera: () -> Unit,
    onZoomIn: () -> Unit,
    onZoomOut: () -> Unit,
    navController: NavController,
    onPlayNode: (AtlasNode) -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, gestureZoom, _ ->
                    onPanZoom(pan.x, pan.y, gestureZoom)
                }
            }
            .pointerInput(Unit) {
                detectTapGestures(onTap = { onSelectNode(null) })
            }
    ) {
        // Deep Space Background Canvas
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawRect(color = AppBackground)

            val centerX = size.width / 2f + panX
            val centerY = size.height / 2f + panY

            // Draw cosmic orbital rings
            drawCircle(
                color = ElectricBlue.copy(alpha = 0.05f),
                radius = 140f * zoom,
                center = Offset(centerX, centerY),
                style = Stroke(width = 1f)
            )
            drawCircle(
                color = ElectricBlue.copy(alpha = 0.04f),
                radius = 260f * zoom,
                center = Offset(centerX, centerY),
                style = Stroke(width = 1f)
            )
            drawCircle(
                color = ElectricBlue.copy(alpha = 0.03f),
                radius = 400f * zoom,
                center = Offset(centerX, centerY),
                style = Stroke(width = 1f)
            )

            // Draw relationship connecting edges
            edges.forEach { edge ->
                val source = nodes.firstOrNull { it.id == edge.sourceId }
                val target = nodes.firstOrNull { it.id == edge.targetId }

                if (source != null && target != null) {
                    val start = Offset(centerX + source.x * zoom, centerY + source.y * zoom)
                    val end = Offset(centerX + target.x * zoom, centerY + target.y * zoom)

                    val isConnectedToSelected = selectedNode != null &&
                        (selectedNode.id == source.id || selectedNode.id == target.id)

                    val edgeColor = if (isConnectedToSelected) ElectricBlue.copy(alpha = 0.85f)
                    else BorderSubtle.copy(alpha = 0.35f)

                    val strokeWidth = if (isConnectedToSelected) 2f * zoom else 1f * zoom

                    drawLine(
                        color = edgeColor,
                        start = start,
                        end = end,
                        strokeWidth = strokeWidth.coerceIn(1f, 3f),
                        cap = StrokeCap.Round
                    )
                }
            }
        }

        // Render Entity Nodes
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val centerX = constraints.maxWidth / 2f + panX
            val centerY = constraints.maxHeight / 2f + panY

            nodes.forEach { node ->
                if (isNodeVisible(node, filter)) {
                    val isSelected = selectedNode?.id == node.id
                    val isNeighbor = selectedNode != null && isNodeNeighbor(node, selectedNode, edges)

                    val nodeX = centerX + node.x * zoom
                    val nodeY = centerY + node.y * zoom

                    Box(
                        modifier = Modifier
                            .offset { IntOffset(nodeX.roundToInt(), nodeY.roundToInt()) }
                            .zIndex(if (isSelected) 10f else if (isNeighbor) 5f else 1f)
                    ) {
                        SoundAtlasNodeItem(
                            node = node,
                            zoom = zoom,
                            isSelected = isSelected,
                            isNeighbor = isNeighbor,
                            onSelect = { onSelectNode(node) },
                            onDoubleTap = { onFocusNode(node) }
                        )
                    }
                }
            }
        }

        // Floating Camera Controls
        Box(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 16.dp)
                .clip(RoundedCornerShape(24.dp))
                .background(ElevatedSurface.copy(alpha = 0.92f))
                .border(1.dp, BorderSubtle, RoundedCornerShape(24.dp))
        ) {
            Column(
                modifier = Modifier.padding(4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                IconButton(onClick = onZoomIn, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Add, contentDescription = "Zoom In", tint = Color.White, modifier = Modifier.size(18.dp))
                }
                IconButton(onClick = onZoomOut, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.Remove, contentDescription = "Zoom Out", tint = Color.White, modifier = Modifier.size(18.dp))
                }
                HorizontalDivider(modifier = Modifier.width(20.dp), color = BorderSubtle)
                IconButton(onClick = onResetCamera, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Default.CenterFocusStrong, contentDescription = "Center", tint = ElectricBlue, modifier = Modifier.size(18.dp))
                }
            }
        }

        // Bottom Selected Entity Inspector Panel (Safe navigationBarsPadding)
        AnimatedVisibility(
            visible = selectedNode != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .navigationBarsPadding()
                .zIndex(15f)
        ) {
            selectedNode?.let { node ->
                SoundAtlasDetailInspector(
                    node = node,
                    navController = navController,
                    onDismiss = { onSelectNode(null) },
                    onFocus = { onFocusNode(node) },
                    onExpand = { SoundAtlas.expandNode(node) },
                    onCollapse = { SoundAtlas.collapseNode(node) },
                    onPlay = { onPlayNode(node) }
                )
            }
        }
    }
}

@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun SoundAtlasNodeItem(
    node: AtlasNode,
    zoom: Float,
    isSelected: Boolean,
    isNeighbor: Boolean,
    onSelect: () -> Unit,
    onDoubleTap: () -> Unit,
) {
    val nodeSizeDp = when (node.type) {
        AtlasNodeType.ARTIST -> (56 * zoom).coerceIn(42f, 76f).dp
        AtlasNodeType.ALBUM -> (48 * zoom).coerceIn(36f, 68f).dp
        AtlasNodeType.TRACK -> (38 * zoom).coerceIn(28f, 52f).dp
    }

    val shape = when (node.type) {
        AtlasNodeType.ARTIST -> CircleShape
        AtlasNodeType.ALBUM -> RoundedCornerShape((8 * zoom).coerceIn(6f, 12f).dp)
        AtlasNodeType.TRACK -> RoundedCornerShape((6 * zoom).coerceIn(4f, 8f).dp)
    }

    val borderStroke = when {
        isSelected -> androidx.compose.foundation.BorderStroke((2.5f * zoom).coerceIn(2f, 4f).dp, Color.White)
        isNeighbor -> androidx.compose.foundation.BorderStroke((1.5f * zoom).coerceIn(1.5f, 3f).dp, ElectricBlue)
        else -> androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle)
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .width(IntrinsicSize.Min)
            .wrapContentHeight()
            .pointerInput(node.id) {
                detectTapGestures(
                    onTap = { onSelect() },
                    onDoubleTap = { onDoubleTap() }
                )
            }
    ) {
        Box(
            modifier = Modifier
                .size(nodeSizeDp)
                .then(
                    if (isSelected) {
                        Modifier.shadow(elevation = 16.dp, shape = shape, spotColor = ElectricBlue, ambientColor = ElectricBlue)
                    } else Modifier
                )
                .clip(shape)
                .background(ElevatedSurface)
                .border(borderStroke, shape)
        ) {
            if (node.artworkUrl.isNotBlank()) {
                GlideImage(
                    model = node.artworkUrl,
                    contentDescription = node.title,
                    contentScale = ContentScale.Crop,
                    transition = CrossFade,
                    modifier = Modifier.fillMaxSize(),
                )
            } else {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Brush.radialGradient(listOf(ElectricBlue.copy(alpha = 0.35f), PrimarySurface))),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = when (node.type) {
                            AtlasNodeType.ARTIST -> Icons.Default.Person
                            AtlasNodeType.ALBUM -> Icons.Default.Album
                            AtlasNodeType.TRACK -> Icons.Default.MusicNote
                        },
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size((20 * zoom).coerceIn(16f, 32f).dp)
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(3.dp))

        Box(
            modifier = Modifier
                .clip(RoundedCornerShape(6.dp))
                .background(ElevatedSurface.copy(alpha = 0.88f))
                .padding(horizontal = 6.dp, vertical = 2.dp)
        ) {
            Text(
                text = node.title,
                color = if (isSelected) Color.White else TextPrimary,
                fontSize = (11 * zoom).coerceIn(9f, 13f).sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

/**
 * Bottom Sheet Detail Inspector displaying real metadata, action controls, and quick navigation.
 */
@OptIn(ExperimentalGlideComposeApi::class)
@Composable
private fun SoundAtlasDetailInspector(
    node: AtlasNode,
    navController: NavController,
    onDismiss: () -> Unit,
    onFocus: () -> Unit,
    onExpand: () -> Unit,
    onCollapse: () -> Unit,
    onPlay: () -> Unit,
) {
    var savedSuccess by remember { mutableStateOf(false) }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 8.dp)
            .clip(RoundedCornerShape(20.dp))
            .border(1.dp, BorderSubtle, RoundedCornerShape(20.dp)),
        color = ElevatedSurface,
        shadowElevation = 18.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val thumbShape = if (node.type == AtlasNodeType.ARTIST) CircleShape else RoundedCornerShape(10.dp)
                Box(
                    modifier = Modifier
                        .size(54.dp)
                        .clip(thumbShape)
                        .background(PrimarySurface)
                        .border(1.dp, BorderSubtle, thumbShape)
                ) {
                    if (node.artworkUrl.isNotBlank()) {
                        GlideImage(
                            model = node.artworkUrl,
                            contentDescription = node.title,
                            contentScale = ContentScale.Crop,
                            transition = CrossFade,
                            modifier = Modifier.fillMaxSize(),
                        )
                    } else {
                        Icon(
                            imageVector = when (node.type) {
                                AtlasNodeType.ARTIST -> Icons.Default.Person
                                AtlasNodeType.ALBUM -> Icons.Default.Album
                                AtlasNodeType.TRACK -> Icons.Default.MusicNote
                            },
                            contentDescription = null,
                            tint = ElectricBlue,
                            modifier = Modifier.align(Alignment.Center)
                        )
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = ElectricBlue.copy(alpha = 0.18f),
                        ) {
                            Text(
                                text = node.type.name,
                                color = ElectricBlueBright,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                            )
                        }
                        if (node.extraInfo.isNotBlank()) {
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "•  ${node.extraInfo}",
                                color = TextSecondary,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(2.dp))

                    Text(
                        text = node.title,
                        color = TextPrimary,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (node.subtitle.isNotBlank()) {
                        Text(
                            text = node.subtitle,
                            color = TextSecondary,
                            fontSize = 12.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                IconButton(onClick = onDismiss, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Action Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Play Action (wired through SongPlayer)
                Button(
                    onClick = onPlay,
                    colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.height(38.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp)
                ) {
                    Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Play", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }

                // Expand / Collapse Action
                OutlinedButton(
                    onClick = { if (node.isExpanded) onCollapse() else onExpand() },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier.height(38.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp)
                ) {
                    Icon(
                        imageVector = if (node.isExpanded) Icons.Default.UnfoldLess else Icons.Default.Hub,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(5.dp))
                    Text(if (node.isExpanded) "Collapse" else "Expand", fontSize = 12.sp)
                }

                // Focus Camera Action
                OutlinedButton(
                    onClick = onFocus,
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier.height(38.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp)
                ) {
                    Icon(Icons.Default.FilterCenterFocus, contentDescription = "Focus", tint = TextSecondary, modifier = Modifier.size(16.dp))
                }

                // Save to Listening Plan
                OutlinedButton(
                    onClick = {
                        val firstPlan = ListeningPlans.plans.firstOrNull()
                        if (firstPlan != null) {
                            ListeningPlans.addItem(
                                planId = firstPlan.id,
                                item = PlanItem(
                                    title = node.title,
                                    uri = node.uri,
                                    type = when (node.type) {
                                        AtlasNodeType.TRACK -> PlanItemType.TRACK
                                        AtlasNodeType.ALBUM -> PlanItemType.ALBUM
                                        AtlasNodeType.ARTIST -> PlanItemType.ALBUM
                                    }
                                )
                            )
                            savedSuccess = true
                        }
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier.height(38.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp)
                ) {
                    Icon(
                        imageVector = if (savedSuccess) Icons.Default.Check else Icons.AutoMirrored.Filled.PlaylistAdd,
                        contentDescription = "Save Plan",
                        tint = if (savedSuccess) ElectricBlue else TextSecondary,
                        modifier = Modifier.size(16.dp)
                    )
                }

                // Add to Music Inbox
                OutlinedButton(
                    onClick = {
                        if (node.uri.isNotBlank()) {
                            MusicInbox.addLink(
                                rawText = node.uri,
                                title = node.title,
                                artist = node.subtitle,
                                artworkUrl = node.artworkUrl,
                                sourceLabel = "Sound Atlas",
                            )
                            savedSuccess = true
                        }
                    },
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                    modifier = Modifier.height(38.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp)
                ) {
                    Icon(Icons.Default.Inbox, contentDescription = "Add to Inbox", tint = TextSecondary, modifier = Modifier.size(16.dp))
                }

                // View Details Navigation (Artist / Album)
                if (node.type == AtlasNodeType.ARTIST || node.type == AtlasNodeType.ALBUM) {
                    OutlinedButton(
                        onClick = {
                            if (node.type == AtlasNodeType.ARTIST) {
                                navController.navigate(artistRoute(node.title, node.uri.substringAfterLast(':')))
                            } else {
                                navController.navigate(albumRoute(node.title, node.subtitle, node.uri.substringAfterLast(':')))
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                        modifier = Modifier.height(38.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.OpenInNew, contentDescription = "View", tint = TextSecondary, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String = "") {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = title,
            color = ElectricBlueBright,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.sp
        )
        if (subtitle.isNotBlank()) {
            Text(
                text = subtitle,
                color = TextSecondary.copy(alpha = 0.7f),
                fontSize = 11.sp
            )
        }
    }
}

private fun formatRelativeTime(timestamp: Long): String {
    val diff = System.currentTimeMillis() - timestamp
    val seconds = diff / 1000
    val minutes = seconds / 60
    val hours = minutes / 60
    val days = hours / 24

    return when {
        seconds < 60 -> "Just now"
        minutes < 60 -> "${minutes}m ago"
        hours < 24 -> "${hours}h ago"
        days == 1L -> "Yesterday"
        days < 7 -> "${days}d ago"
        else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(Date(timestamp))
    }
}

private fun isNodeVisible(node: AtlasNode, filter: AtlasFilter): Boolean = when (filter) {
    AtlasFilter.ALL -> true
    AtlasFilter.ARTISTS -> node.type == AtlasNodeType.ARTIST
    AtlasFilter.ALBUMS -> node.type == AtlasNodeType.ALBUM
    AtlasFilter.TRACKS -> node.type == AtlasNodeType.TRACK
}

private fun isNodeNeighbor(
    node: AtlasNode,
    selectedNode: AtlasNode,
    edges: List<AtlasEdge>,
): Boolean {
    return edges.any {
        (it.sourceId == selectedNode.id && it.targetId == node.id) ||
        (it.targetId == selectedNode.id && it.sourceId == node.id)
    }
}
