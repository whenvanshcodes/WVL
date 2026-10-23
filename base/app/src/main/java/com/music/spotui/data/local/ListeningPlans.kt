package com.music.spotui.data.local

import android.content.Context
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.snapshots.SnapshotStateList
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

enum class PlanItemType {
    TRACK,
    ALBUM,
    PLAYLIST;

    companion object {
        fun fromString(s: String): PlanItemType =
            entries.firstOrNull { it.name.equals(s, ignoreCase = true) } ?: ALBUM
    }
}

enum class PlanStatus(val label: String) {
    TO_LISTEN("To Listen"),
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed");

    companion object {
        fun fromString(s: String): PlanStatus =
            entries.firstOrNull { it.name.equals(s, ignoreCase = true) } ?: TO_LISTEN
    }
}

data class PlanItem(
    val id: String = UUID.randomUUID().toString(),
    val uri: String,
    val title: String,
    val subtitle: String = "",
    val artworkUrl: String = "",
    val type: PlanItemType = PlanItemType.ALBUM,
    val isCompleted: Boolean = false,
    val completedAt: Long = 0L,
    val lastPositionMs: Long = 0L,
    val durationMs: Long = 0L,
    val notes: String = "",
)

data class ListeningPlan(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val description: String = "",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val items: List<PlanItem> = emptyList(),
) {
    val totalCount: Int get() = items.size
    val completedCount: Int get() = items.count { it.isCompleted }
    val progressPercent: Int get() = if (totalCount == 0) 0 else ((completedCount.toFloat() / totalCount) * 100).toInt()
    val status: PlanStatus get() = when {
        totalCount == 0 || completedCount == 0 -> PlanStatus.TO_LISTEN
        completedCount >= totalCount -> PlanStatus.COMPLETED
        else -> PlanStatus.IN_PROGRESS
    }
}

/**
 * Listening Plans: Intentional music goals (e.g. "Albums to hear this month", "Explore artist discography").
 * Stored locally on-device without guilt-inducing streaks or arbitrary timers.
 */
object ListeningPlans {
    private const val VERSION = 1
    private lateinit var storageFile: File
    private val lock = Any()

    val plans: SnapshotStateList<ListeningPlan> = mutableStateListOf()

    fun init(context: Context) {
        synchronized(lock) {
            if (::storageFile.isInitialized) return
            storageFile = File(context.filesDir, "listening_plans.json")
            if (storageFile.exists()) {
                runCatching { read(storageFile.readText()) }
            }
        }
    }

    fun createPlan(title: String, description: String = ""): ListeningPlan {
        val plan = ListeningPlan(
            id = UUID.randomUUID().toString(),
            title = title.trim(),
            description = description.trim(),
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis(),
            items = emptyList(),
        )
        synchronized(lock) {
            plans.add(0, plan)
            persistLocked()
        }
        return plan
    }

    fun updatePlan(updated: ListeningPlan) {
        synchronized(lock) {
            val index = plans.indexOfFirst { it.id == updated.id }
            if (index != -1) {
                plans[index] = updated.copy(updatedAt = System.currentTimeMillis())
                persistLocked()
            }
        }
    }

    fun deletePlan(id: String): ListeningPlan? {
        synchronized(lock) {
            val index = plans.indexOfFirst { it.id == id }
            if (index != -1) {
                val removed = plans.removeAt(index)
                persistLocked()
                return removed
            }
        }
        return null
    }

    fun addItem(planId: String, item: PlanItem) {
        synchronized(lock) {
            val index = plans.indexOfFirst { it.id == planId }
            if (index != -1) {
                val plan = plans[index]
                // Prevent duplicate URI in same plan
                if (plan.items.none { it.uri == item.uri }) {
                    val updatedItems = plan.items + item
                    plans[index] = plan.copy(items = updatedItems, updatedAt = System.currentTimeMillis())
                    persistLocked()
                }
            }
        }
    }

    fun removeItem(planId: String, itemId: String) {
        synchronized(lock) {
            val index = plans.indexOfFirst { it.id == planId }
            if (index != -1) {
                val plan = plans[index]
                val updatedItems = plan.items.filterNot { it.id == itemId }
                plans[index] = plan.copy(items = updatedItems, updatedAt = System.currentTimeMillis())
                persistLocked()
            }
        }
    }

    fun toggleItemCompleted(planId: String, itemId: String) {
        synchronized(lock) {
            val planIndex = plans.indexOfFirst { it.id == planId }
            if (planIndex != -1) {
                val plan = plans[planIndex]
                val updatedItems = plan.items.map { item ->
                    if (item.id == itemId) {
                        val nextCompleted = !item.isCompleted
                        item.copy(
                            isCompleted = nextCompleted,
                            completedAt = if (nextCompleted) System.currentTimeMillis() else 0L,
                        )
                    } else item
                }
                plans[planIndex] = plan.copy(items = updatedItems, updatedAt = System.currentTimeMillis())
                persistLocked()
            }
        }
    }

    fun updatePlaybackPosition(uri: String, positionMs: Long, durationMs: Long) {
        if (uri.isBlank()) return
        synchronized(lock) {
            var changed = false
            for (i in 0 until plans.size) {
                val plan = plans[i]
                val updatedItems = plan.items.map { item ->
                    if (item.uri == uri) {
                        changed = true
                        val completed = durationMs > 0 && positionMs >= (durationMs * 0.9f)
                        item.copy(
                            lastPositionMs = positionMs,
                            durationMs = if (durationMs > 0) durationMs else item.durationMs,
                            isCompleted = if (completed) true else item.isCompleted,
                            completedAt = if (completed && !item.isCompleted) System.currentTimeMillis() else item.completedAt,
                        )
                    } else item
                }
                if (changed) {
                    plans[i] = plan.copy(items = updatedItems)
                }
            }
            if (changed) {
                persistLocked()
            }
        }
    }

    fun getPlan(id: String): ListeningPlan? = plans.firstOrNull { it.id == id }

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
        plans.forEach { plan ->
            val pObj = JSONObject()
                .put("id", plan.id)
                .put("title", plan.title)
                .put("description", plan.description)
                .put("createdAt", plan.createdAt)
                .put("updatedAt", plan.updatedAt)

            val itemsArr = JSONArray()
            plan.items.forEach { item ->
                val iObj = JSONObject()
                    .put("id", item.id)
                    .put("uri", item.uri)
                    .put("title", item.title)
                    .put("subtitle", item.subtitle)
                    .put("artworkUrl", item.artworkUrl)
                    .put("type", item.type.name)
                    .put("isCompleted", item.isCompleted)
                    .put("completedAt", item.completedAt)
                    .put("lastPositionMs", item.lastPositionMs)
                    .put("durationMs", item.durationMs)
                    .put("notes", item.notes)
                itemsArr.put(iObj)
            }
            pObj.put("items", itemsArr)
            array.put(pObj)
        }
        root.put("plans", array)
        return root.toString()
    }

    internal fun read(jsonText: String) {
        val root = JSONObject(jsonText)
        if (root.optInt("version", 0) != VERSION) return
        val array = root.optJSONArray("plans") ?: return
        val loaded = mutableListOf<ListeningPlan>()
        for (i in 0 until array.length()) {
            val pObj = array.optJSONObject(i) ?: continue
            val itemsArr = pObj.optJSONArray("items") ?: JSONArray()
            val items = mutableListOf<PlanItem>()
            for (j in 0 until itemsArr.length()) {
                val iObj = itemsArr.optJSONObject(j) ?: continue
                items.add(
                    PlanItem(
                        id = iObj.optString("id", UUID.randomUUID().toString()),
                        uri = iObj.optString("uri", ""),
                        title = iObj.optString("title", ""),
                        subtitle = iObj.optString("subtitle", ""),
                        artworkUrl = iObj.optString("artworkUrl", ""),
                        type = PlanItemType.fromString(iObj.optString("type", "ALBUM")),
                        isCompleted = iObj.optBoolean("isCompleted", false),
                        completedAt = iObj.optLong("completedAt", 0L),
                        lastPositionMs = iObj.optLong("lastPositionMs", 0L),
                        durationMs = iObj.optLong("durationMs", 0L),
                        notes = iObj.optString("notes", ""),
                    )
                )
            }
            loaded.add(
                ListeningPlan(
                    id = pObj.optString("id", UUID.randomUUID().toString()),
                    title = pObj.optString("title", ""),
                    description = pObj.optString("description", ""),
                    createdAt = pObj.optLong("createdAt", System.currentTimeMillis()),
                    updatedAt = pObj.optLong("updatedAt", System.currentTimeMillis()),
                    items = items,
                )
            )
        }
        plans.clear()
        plans.addAll(loaded)
    }
}
