package com.music.spotui.data.local

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class ListeningPlansTest {

    @Before
    fun setUp() {
        ListeningPlans.plans.clear()
    }

    @Test
    fun testCreatePlanAndAddItems() {
        val plan = ListeningPlans.createPlan(title = "October Albums", description = "Albums to finish this month")
        assertEquals(1, ListeningPlans.plans.size)
        assertEquals("October Albums", plan.title)
        assertEquals(PlanStatus.TO_LISTEN, plan.status)
        assertEquals(0, plan.progressPercent)

        val item1 = PlanItem(uri = "spotify:album:1", title = "Abbey Road", type = PlanItemType.ALBUM)
        val item2 = PlanItem(uri = "spotify:album:2", title = "The Dark Side of the Moon", type = PlanItemType.ALBUM)

        ListeningPlans.addItem(plan.id, item1)
        ListeningPlans.addItem(plan.id, item2)

        val updated = ListeningPlans.getPlan(plan.id)!!
        assertEquals(2, updated.totalCount)
        assertEquals(0, updated.completedCount)
        assertEquals(PlanStatus.TO_LISTEN, updated.status)
    }

    @Test
    fun testProgressAndCompletionToggle() {
        val plan = ListeningPlans.createPlan(title = "Singles", description = "Test singles")
        val item1 = PlanItem(uri = "spotify:track:1", title = "Song 1", type = PlanItemType.TRACK)
        val item2 = PlanItem(uri = "spotify:track:2", title = "Song 2", type = PlanItemType.TRACK)

        ListeningPlans.addItem(plan.id, item1)
        ListeningPlans.addItem(plan.id, item2)

        // Mark item1 completed
        ListeningPlans.toggleItemCompleted(plan.id, item1.id)
        val inProgress = ListeningPlans.getPlan(plan.id)!!
        assertEquals(1, inProgress.completedCount)
        assertEquals(50, inProgress.progressPercent)
        assertEquals(PlanStatus.IN_PROGRESS, inProgress.status)

        // Mark item2 completed
        ListeningPlans.toggleItemCompleted(plan.id, item2.id)
        val completed = ListeningPlans.getPlan(plan.id)!!
        assertEquals(2, completed.completedCount)
        assertEquals(100, completed.progressPercent)
        assertEquals(PlanStatus.COMPLETED, completed.status)
    }

    @Test
    fun testJsonSerializationRoundtrip() {
        val plan = ListeningPlans.createPlan(title = "My Plan", description = "Notes here")
        ListeningPlans.addItem(plan.id, PlanItem(uri = "spotify:track:test", title = "Test Song", type = PlanItemType.TRACK))

        val json = ListeningPlans.writeJson()
        assertTrue(json.contains("My Plan"))
        assertTrue(json.contains("Test Song"))

        ListeningPlans.plans.clear()
        assertEquals(0, ListeningPlans.plans.size)

        ListeningPlans.read(json)
        assertEquals(1, ListeningPlans.plans.size)
        val restored = ListeningPlans.plans.first()
        assertEquals("My Plan", restored.title)
        assertEquals(1, restored.items.size)
        assertEquals("Test Song", restored.items.first().title)
    }
}
