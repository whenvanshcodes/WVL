package com.music.spotui.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import app.myspoti.host.android.MyspotiRuntime
import com.music.spotui.data.local.InboxItem
import com.music.spotui.data.local.InboxStatus
import com.music.spotui.data.local.ListeningPlans
import com.music.spotui.data.local.MusicInbox
import com.music.spotui.data.local.PlanItem
import com.music.spotui.data.local.PlanItemType
import com.music.spotui.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InboxScreen(navController: NavController) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var selectedFilter by remember { mutableStateOf<InboxStatus?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingItem by remember { mutableStateOf<InboxItem?>(null) }
    var selectedItemForPlan by remember { mutableStateOf<InboxItem?>(null) }

    val rawItems = MusicInbox.items
    val filteredItems = remember(rawItems, selectedFilter, searchQuery) {
        rawItems.filter { item ->
            val matchesFilter = selectedFilter == null || item.status == selectedFilter
            val matchesSearch = searchQuery.isBlank() ||
                item.displayTitle.contains(searchQuery, ignoreCase = true) ||
                item.artist.contains(searchQuery, ignoreCase = true) ||
                item.note.contains(searchQuery, ignoreCase = true) ||
                item.sourceLabel.contains(searchQuery, ignoreCase = true) ||
                item.originalUrl.contains(searchQuery, ignoreCase = true)
            matchesFilter && matchesSearch
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            text = "Music Inbox",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 20.sp,
                        )
                        Text(
                            text = "${rawItems.size} saved items",
                            color = TextSecondary,
                            fontSize = 12.sp,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { showAddDialog = true }) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Add Link",
                            tint = ElectricBlue,
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = AppBackground,
                )
            )
        },
        containerColor = AppBackground,
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(AppBackground)
        ) {
            // Search field
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                placeholder = { Text("Search by title, artist, note, or URL...", color = TextSecondary, fontSize = 14.sp) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = TextSecondary) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Close, contentDescription = "Clear", tint = TextSecondary)
                        }
                    }
                },
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ElectricBlue,
                    unfocusedBorderColor = BorderSubtle,
                    focusedContainerColor = PrimarySurface,
                    unfocusedContainerColor = PrimarySurface,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                ),
                singleLine = true,
            )

            // Status filter chips
            LazyRow(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                item {
                    FilterChip(
                        selected = selectedFilter == null,
                        onClick = { selectedFilter = null },
                        label = { Text("All (${rawItems.size})") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = ElectricBlue,
                            selectedLabelColor = Color.Black,
                            containerColor = PrimarySurface,
                            labelColor = TextSecondary,
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = if (selectedFilter == null) ElectricBlue else BorderSubtle,
                            enabled = true,
                            selected = selectedFilter == null,
                        )
                    )
                }
                items(InboxStatus.entries) { status ->
                    val count = rawItems.count { it.status == status }
                    FilterChip(
                        selected = selectedFilter == status,
                        onClick = { selectedFilter = if (selectedFilter == status) null else status },
                        label = { Text("${status.label} ($count)") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = ElectricBlue,
                            selectedLabelColor = Color.Black,
                            containerColor = PrimarySurface,
                            labelColor = TextSecondary,
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            borderColor = if (selectedFilter == status) ElectricBlue else BorderSubtle,
                            enabled = true,
                            selected = selectedFilter == status,
                        )
                    )
                }
            }

            // Items list or empty state
            if (filteredItems.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Inbox,
                            contentDescription = null,
                            tint = ElectricBlue,
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            text = if (searchQuery.isNotBlank() || selectedFilter != null)
                                "No items match your filter"
                            else
                                "Your Music Inbox is empty",
                            color = TextPrimary,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 18.sp,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (searchQuery.isNotBlank() || selectedFilter != null)
                                "Try clearing the search or status filter."
                            else
                                "Share music links from Spotify, YouTube, Instagram or browser, or tap + to paste a link.",
                            color = TextSecondary,
                            fontSize = 14.sp,
                            modifier = Modifier.padding(horizontal = 16.dp),
                            lineHeight = 20.sp,
                        )
                        if (rawItems.isEmpty()) {
                            Spacer(modifier = Modifier.height(20.dp))
                            Button(
                                onClick = { showAddDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, tint = Color.Black)
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Add Music Link", color = Color.Black, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(filteredItems, key = { it.id }) { item ->
                        InboxItemCard(
                            item = item,
                            onPlay = {
                                if (item.spotifyUri.isNotBlank()) {
                                    scope.launch {
                                        runCatching { MyspotiRuntime.api.player.play(item.spotifyUri) }
                                    }
                                } else {
                                    runCatching {
                                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(item.originalUrl))
                                        context.startActivity(browserIntent)
                                    }
                                }
                            },
                            onOpenUrl = {
                                runCatching {
                                    val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(item.originalUrl))
                                    context.startActivity(browserIntent)
                                }
                            },
                            onStatusChange = { newStatus ->
                                MusicInbox.updateStatus(item.id, newStatus)
                            },
                            onEditNote = {
                                editingItem = item
                            },
                            onAddToPlan = {
                                selectedItemForPlan = item
                            },
                            onDelete = {
                                val removed = MusicInbox.remove(item.id)
                                if (removed != null) {
                                    scope.launch {
                                        val result = snackbarHostState.showSnackbar(
                                            message = "Removed \"${removed.displayTitle}\"",
                                            actionLabel = "Undo",
                                            duration = SnackbarDuration.Short,
                                        )
                                        if (result == SnackbarResult.ActionPerformed) {
                                            MusicInbox.restore(removed)
                                        }
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Add Link Dialog
    if (showAddDialog) {
        AddLinkDialog(
            onDismiss = { showAddDialog = false },
            onAdd = { url, note, label ->
                val (saved, isNew) = MusicInbox.addLink(rawText = url, note = note, sourceLabel = label)
                showAddDialog = false
                scope.launch {
                    snackbarHostState.showSnackbar(
                        message = if (isNew) "Added to Inbox: ${saved.displayTitle}" else "Already in Inbox",
                        duration = SnackbarDuration.Short
                    )
                }
            }
        )
    }

    // Edit Note Dialog
    editingItem?.let { item ->
        EditNoteDialog(
            item = item,
            onDismiss = { editingItem = null },
            onSave = { newNote ->
                MusicInbox.updateNote(item.id, newNote)
                editingItem = null
            }
        )
    }

    // Add to Listening Plan Dialog
    selectedItemForPlan?.let { item ->
        AddToPlanDialog(
            item = item,
            onDismiss = { selectedItemForPlan = null },
            onSelectPlan = { planId ->
                ListeningPlans.addItem(
                    planId = planId,
                    item = PlanItem(
                        uri = if (item.spotifyUri.isNotBlank()) item.spotifyUri else item.originalUrl,
                        title = item.displayTitle,
                        subtitle = item.displaySubtitle,
                        artworkUrl = item.artworkUrl,
                        type = if (item.spotifyUri.startsWith("spotify:album")) PlanItemType.ALBUM
                               else if (item.spotifyUri.startsWith("spotify:playlist")) PlanItemType.PLAYLIST
                               else PlanItemType.TRACK,
                        notes = item.note,
                    )
                )
                selectedItemForPlan = null
                scope.launch {
                    snackbarHostState.showSnackbar("Added to Listening Plan!", duration = SnackbarDuration.Short)
                }
            }
        )
    }
}

@Composable
private fun InboxItemCard(
    item: InboxItem,
    onPlay: () -> Unit,
    onOpenUrl: () -> Unit,
    onStatusChange: (InboxStatus) -> Unit,
    onEditNote: () -> Unit,
    onAddToPlan: () -> Unit,
    onDelete: () -> Unit,
) {
    var expandedMenu by remember { mutableStateOf(false) }
    val dateFormat = remember { SimpleDateFormat("MMM d, yyyy", Locale.getDefault()) }
    val formattedDate = remember(item.savedAt) { dateFormat.format(Date(item.savedAt)) }

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(ElevatedSurface)
            .border(1.dp, BorderSubtle, RoundedCornerShape(14.dp))
            .padding(14.dp)
    ) {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Source / Status Icon
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(RoundedCornerShape(10.dp))
                        .background(PrimarySurface)
                        .border(1.dp, BorderSubtle, RoundedCornerShape(10.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = if (item.spotifyUri.isNotBlank()) Icons.Default.MusicNote else Icons.Default.Link,
                        contentDescription = null,
                        tint = ElectricBlue,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = item.displayTitle,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 15.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = "${item.displaySubtitle} • $formattedDate",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }

                // Status chip dropdown button
                Box {
                    Surface(
                        onClick = { expandedMenu = true },
                        shape = RoundedCornerShape(8.dp),
                        color = when (item.status) {
                            InboxStatus.TO_LISTEN -> ElectricBlue.copy(alpha = 0.15f)
                            InboxStatus.LISTENING -> Color(0xFFF59E0B).copy(alpha = 0.15f)
                            InboxStatus.COMPLETED -> Color(0xFF10B981).copy(alpha = 0.15f)
                            InboxStatus.ARCHIVED -> Color(0xFF6B7280).copy(alpha = 0.15f)
                        },
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            when (item.status) {
                                InboxStatus.TO_LISTEN -> ElectricBlue.copy(alpha = 0.4f)
                                InboxStatus.LISTENING -> Color(0xFFF59E0B).copy(alpha = 0.4f)
                                InboxStatus.COMPLETED -> Color(0xFF10B981).copy(alpha = 0.4f)
                                InboxStatus.ARCHIVED -> Color(0xFF6B7280).copy(alpha = 0.4f)
                            }
                        ),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = item.status.label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = when (item.status) {
                                    InboxStatus.TO_LISTEN -> ElectricBlue
                                    InboxStatus.LISTENING -> Color(0xFFF59E0B)
                                    InboxStatus.COMPLETED -> Color(0xFF10B981)
                                    InboxStatus.ARCHIVED -> Color(0xFF9CA3AF)
                                }
                            )
                            Icon(
                                Icons.Default.ArrowDropDown,
                                contentDescription = null,
                                tint = TextSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }

                    DropdownMenu(
                        expanded = expandedMenu,
                        onDismissRequest = { expandedMenu = false },
                        modifier = Modifier.background(ElevatedSurface)
                    ) {
                        InboxStatus.entries.forEach { s ->
                            DropdownMenuItem(
                                text = { Text(s.label, color = if (s == item.status) ElectricBlue else TextPrimary) },
                                onClick = {
                                    onStatusChange(s)
                                    expandedMenu = false
                                }
                            )
                        }
                        HorizontalDivider(color = BorderSubtle)
                        DropdownMenuItem(
                            text = { Text("Edit Note", color = TextPrimary) },
                            leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null, tint = TextSecondary) },
                            onClick = {
                                onEditNote()
                                expandedMenu = false
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Add to Listening Plan", color = TextPrimary) },
                            leadingIcon = { Icon(Icons.Default.PlaylistAdd, contentDescription = null, tint = TextSecondary) },
                            onClick = {
                                onAddToPlan()
                                expandedMenu = false
                            }
                        )
                        DropdownMenuItem(
                            text = { Text("Delete", color = Color(0xFFF87171)) },
                            leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = Color(0xFFF87171)) },
                            onClick = {
                                onDelete()
                                expandedMenu = false
                            }
                        )
                    }
                }
            }

            // Note section if present
            if (item.note.isNotBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(PrimarySurface)
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "Note: ${item.note}",
                        color = TextSecondary,
                        fontSize = 12.sp,
                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Action row: Play / Open / Add to Plan / Delete
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (item.spotifyUri.isNotBlank()) {
                    Button(
                        onClick = onPlay,
                        modifier = Modifier.height(34.dp),
                        shape = RoundedCornerShape(8.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                        contentPadding = PaddingValues(horizontal = 12.dp),
                    ) {
                        Icon(Icons.Default.PlayArrow, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Play", color = Color.Black, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                OutlinedButton(
                    onClick = onOpenUrl,
                    modifier = Modifier.height(34.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                    contentPadding = PaddingValues(horizontal = 10.dp),
                ) {
                    Icon(Icons.Default.OpenInBrowser, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Open", fontSize = 12.sp)
                }

                OutlinedButton(
                    onClick = onAddToPlan,
                    modifier = Modifier.height(34.dp),
                    shape = RoundedCornerShape(8.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                    border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                    contentPadding = PaddingValues(horizontal = 10.dp),
                ) {
                    Icon(Icons.Default.PlaylistAdd, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(15.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Plan", fontSize = 12.sp)
                }

                Spacer(modifier = Modifier.weight(1f))

                IconButton(
                    onClick = onDelete,
                    modifier = Modifier.size(34.dp)
                ) {
                    Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = TextSecondary, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun AddLinkDialog(
    onDismiss: () -> Unit,
    onAdd: (url: String, note: String, label: String) -> Unit,
) {
    val clipboardManager = LocalClipboardManager.current
    var urlText by remember { mutableStateOf("") }
    var noteText by remember { mutableStateOf("") }
    var labelText by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Save to Music Inbox", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = urlText,
                    onValueChange = { urlText = it },
                    label = { Text("URL or Text", color = TextSecondary) },
                    placeholder = { Text("https://open.spotify.com/...", color = TextSecondary) },
                    trailingIcon = {
                        IconButton(onClick = {
                            clipboardManager.getText()?.text?.let { urlText = it }
                        }) {
                            Icon(Icons.Default.ContentPaste, contentDescription = "Paste", tint = ElectricBlue)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ElectricBlue,
                        unfocusedBorderColor = BorderSubtle,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                    )
                )

                OutlinedTextField(
                    value = noteText,
                    onValueChange = { noteText = it },
                    label = { Text("Optional Note", color = TextSecondary) },
                    placeholder = { Text("e.g. Recommended by friend", color = TextSecondary) },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = ElectricBlue,
                        unfocusedBorderColor = BorderSubtle,
                        focusedTextColor = TextPrimary,
                        unfocusedTextColor = TextPrimary,
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (urlText.isNotBlank()) onAdd(urlText, noteText, labelText)
                },
                enabled = urlText.isNotBlank(),
                colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                shape = RoundedCornerShape(8.dp),
            ) {
                Text("Save", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        },
        containerColor = ElevatedSurface,
    )
}

@Composable
private fun EditNoteDialog(
    item: InboxItem,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit,
) {
    var noteText by remember { mutableStateOf(item.note) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Note", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            OutlinedTextField(
                value = noteText,
                onValueChange = { noteText = it },
                label = { Text("Note", color = TextSecondary) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(10.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = ElectricBlue,
                    unfocusedBorderColor = BorderSubtle,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                )
            )
        },
        confirmButton = {
            Button(
                onClick = { onSave(noteText) },
                colors = ButtonDefaults.buttonColors(containerColor = ElectricBlue),
                shape = RoundedCornerShape(8.dp),
            ) {
                Text("Save", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        },
        containerColor = ElevatedSurface,
    )
}

@Composable
private fun AddToPlanDialog(
    item: InboxItem,
    onDismiss: () -> Unit,
    onSelectPlan: (planId: String) -> Unit,
) {
    val plans = ListeningPlans.plans

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Add to Listening Plan", color = TextPrimary, fontWeight = FontWeight.Bold) },
        text = {
            if (plans.isEmpty()) {
                Text("No listening plans created yet. Create one in the Listening Plans tab first!", color = TextSecondary)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(plans) { plan ->
                        Surface(
                            onClick = { onSelectPlan(plan.id) },
                            shape = RoundedCornerShape(10.dp),
                            color = PrimarySurface,
                            border = androidx.compose.foundation.BorderStroke(1.dp, BorderSubtle),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.PlaylistPlay, contentDescription = null, tint = ElectricBlue)
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(plan.title, color = TextPrimary, fontWeight = FontWeight.SemiBold)
                                    Text("${plan.items.size} items • ${plan.progressPercent}% completed", color = TextSecondary, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextSecondary)
            }
        },
        containerColor = ElevatedSurface,
    )
}
