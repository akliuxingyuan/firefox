/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.components.metrics

import android.app.Activity
import android.app.Application
import android.content.Context
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import mozilla.components.support.utils.ext.getPackageInfoCompat
import org.mozilla.fenix.android.DefaultActivityLifecycleCallbacks
import org.mozilla.fenix.ext.settings
import org.mozilla.fenix.nimbus.FxNimbus
import org.mozilla.fenix.utils.Settings
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

/**
 * Interface defining functions around persisted local state for certain metrics.
 */
interface MetricsStorage {
    /**
     * Determines whether an [event] should be sent based on locally-stored state.
     */
    suspend fun shouldTrack(event: Event): Boolean

    /**
     * Updates locally-stored state for an [event] that has just been sent.
     */
    suspend fun updateSentState(event: Event)

    /**
     * Updates locally-stored data related to an [event] that has just been sent.
     */
    suspend fun updatePersistentState(event: Event)

    /**
     * Will try to register this as a recorder of app usage based on whether usage recording is still
     * needed. It will measure usage by to monitoring lifecycle callbacks from [application]'s
     * activities and should update local state using [updateUsageState].
     */
    fun tryRegisterAsUsageRecorder(application: Application)

    /**
     * Update local state with a [usageLength] measurement.
     */
    fun updateUsageState(usageLength: Long)
}

internal class DefaultMetricsStorage(
    context: Context,
    private val settings: Settings,
    private val checkDefaultBrowser: () -> Boolean,
    private val shouldSendGenerally: () -> Boolean = { shouldSendGenerally(context) },
    private val getInstalledTime: () -> Long = { getInstalledTime(context) },
    private val dispatcher: CoroutineDispatcher = Dispatchers.IO,
) : MetricsStorage {

    private val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)

    /**
     * Checks local state to see whether the [event] should be sent.
     */
    @Suppress("CyclomaticComplexMethod")
    override suspend fun shouldTrack(event: Event): Boolean =
        withContext(dispatcher) {
            // The side-effect of storing days of use always needs to happen.
            updateDaysOfUse()
            val currentTime = System.currentTimeMillis()
            shouldSendGenerally() && when (event) {
                Event.GrowthData.SetAsDefault -> {
                    currentTime.duringFirstMonth() &&
                        !settings.setAsDefaultGrowthSent &&
                        checkDefaultBrowser()
                }
                Event.GrowthData.FirstWeekSeriesActivity -> {
                    currentTime.duringFirstMonth() && shouldTrackFirstWeekActivity()
                }
                Event.GrowthData.SerpAdClicked -> {
                    currentTime.duringFirstMonth() && !settings.adClickGrowthSent
                }
                Event.GrowthData.UsageThreshold -> {
                    !settings.usageTimeGrowthSent &&
                        settings.usageTimeGrowthData > USAGE_THRESHOLD_MILLIS
                }
                Event.GrowthData.FirstAppOpenForDay -> {
                    currentTime.afterFirstDay() &&
                        currentTime.duringFirstMonth() &&
                        settings.resumeGrowthLastSent.hasBeenMoreThanDaySince()
                }
                Event.GrowthData.FirstUriLoadForDay -> {
                    currentTime.afterFirstDay() &&
                        currentTime.duringFirstMonth() &&
                        settings.uriLoadGrowthLastSent.hasBeenMoreThanDaySince()
                }
                is Event.GrowthData.UserActivated -> {
                    hasUserReachedActivatedThreshold()
                }
            }
        }

    override suspend fun updateSentState(event: Event) = withContext(dispatcher) {
        when (event) {
            Event.GrowthData.SetAsDefault -> {
                settings.setAsDefaultGrowthSent = true
            }
            Event.GrowthData.FirstWeekSeriesActivity -> {
                settings.firstWeekSeriesGrowthSent = true
            }
            Event.GrowthData.SerpAdClicked -> {
                settings.adClickGrowthSent = true
            }
            Event.GrowthData.UsageThreshold -> {
                settings.usageTimeGrowthSent = true
            }
            Event.GrowthData.FirstAppOpenForDay -> {
                settings.resumeGrowthLastSent = System.currentTimeMillis()
            }
            Event.GrowthData.FirstUriLoadForDay -> {
                settings.uriLoadGrowthLastSent = System.currentTimeMillis()
            }
            is Event.GrowthData.UserActivated -> {
                settings.growthUserActivatedSent = true
            }
        }
    }

    override suspend fun updatePersistentState(event: Event) {
        when (event) {
            is Event.GrowthData.UserActivated -> {
                if (event.fromSearch && shouldUpdateSearchUsage()) {
                    settings.growthEarlySearchUsed = true
                } else if (!event.fromSearch && shouldUpdateUsageCount()) {
                    settings.growthEarlyUseCount.increment()
                    settings.growthEarlyUseCountLastIncrement = System.currentTimeMillis()
                }
            }
            else -> Unit
        }
    }

    override fun tryRegisterAsUsageRecorder(application: Application) {
        // Currently there is only interest in measuring usage during the first day of install.
        if (!settings.usageTimeGrowthSent && System.currentTimeMillis().duringFirstDay()) {
            application.registerActivityLifecycleCallbacks(UsageRecorder(this))
        }
    }

    override fun updateUsageState(usageLength: Long) {
        settings.usageTimeGrowthData += usageLength
    }

    private fun updateDaysOfUse() {
        val daysOfUse = settings.firstWeekDaysOfUseGrowthData
        val currentDate = Calendar.getInstance(Locale.US)
        val currentDateString = dateFormatter.format(currentDate.time)
        if (currentDate.timeInMillis.duringFirstWeek() && daysOfUse.none { it == currentDateString }) {
            settings.firstWeekDaysOfUseGrowthData = daysOfUse + currentDateString
        }
    }

    private fun shouldTrackFirstWeekActivity(): Boolean = Result.runCatching {
        if (!System.currentTimeMillis().duringFirstWeek() || settings.firstWeekSeriesGrowthSent) {
            return false
        }

        val daysOfUse = settings.firstWeekDaysOfUseGrowthData.map {
            dateFormatter.parse(it)
        }.sorted()

        // This loop will check whether the existing list of days of use, combined with the
        // current date, contains any periods of 3 days of use in a row.
        for (idx in daysOfUse.indices) {
            if (idx + 1 > daysOfUse.lastIndex || idx + 2 > daysOfUse.lastIndex) {
                continue
            }

            val referenceDate = daysOfUse[idx]!!.time.toCalendar()
            val secondDateEntry = daysOfUse[idx + 1]!!.time.toCalendar()
            val thirdDateEntry = daysOfUse[idx + 2]!!.time.toCalendar()
            val oneDayAfterReference = referenceDate.createNextDay()
            val twoDaysAfterReference = oneDayAfterReference.createNextDay()

            if (oneDayAfterReference == secondDateEntry && thirdDateEntry == twoDaysAfterReference) {
                return true
            }
        }
        return false
    }.getOrDefault(false)

    private fun Long.toCalendar(): Calendar = Calendar.getInstance(Locale.US).also { calendar ->
        calendar.timeInMillis = this
    }

    private fun Long.hasBeenMoreThanDaySince() = System.currentTimeMillis() - this > DAY_MILLIS

    private fun Long.afterFirstDay() = this > getInstalledTime() + DAY_MILLIS

    private fun Long.duringFirstDay() = this < getInstalledTime() + DAY_MILLIS

    private fun Long.afterThirdDay() = this > getInstalledTime() + THREE_DAY_MILLIS

    private fun Long.duringFirstWeek() = this < getInstalledTime() + FULL_WEEK_MILLIS

    private fun Long.duringFirstMonth() = this < getInstalledTime() + SHORTEST_MONTH_MILLIS

    private fun Calendar.createNextDay() = (this.clone() as Calendar).also { calendar ->
        calendar.add(Calendar.DAY_OF_MONTH, 1)
    }

    private fun hasUserReachedActivatedThreshold(): Boolean {
        return !settings.growthUserActivatedSent &&
            settings.growthEarlyUseCount.value >= DAYS_ACTIVATED_THREASHOLD &&
            settings.growthEarlySearchUsed
    }

    private fun shouldUpdateUsageCount(): Boolean {
        val currentTime = System.currentTimeMillis()
        return currentTime.afterFirstDay() &&
            currentTime.duringFirstWeek() &&
            settings.growthEarlyUseCountLastIncrement.hasBeenMoreThanDaySince()
    }

    private fun shouldUpdateSearchUsage(): Boolean {
        val currentTime = System.currentTimeMillis()
        return currentTime.afterThirdDay() &&
            currentTime.duringFirstWeek()
    }

    /**
     * This will store app usage time to disk, based on Resume and Pause lifecycle events. Currently,
     * there is only interest in usage during the first day after install.
     */
    internal class UsageRecorder(
        private val metricsStorage: MetricsStorage,
    ) : DefaultActivityLifecycleCallbacks {
        private val activityStartTimes: MutableMap<String, Long?> = mutableMapOf()

        override fun onActivityResumed(activity: Activity) {
            super.onActivityResumed(activity)
            activityStartTimes[activity.componentName.toString()] = System.currentTimeMillis()
        }

        override fun onActivityPaused(activity: Activity) {
            super.onActivityPaused(activity)
            val startTime = activityStartTimes[activity.componentName.toString()] ?: return
            val elapsedTimeMillis = System.currentTimeMillis() - startTime
            metricsStorage.updateUsageState(elapsedTimeMillis)
        }
    }

    companion object {
        private const val DAY_MILLIS: Long = 1000 * 60 * 60 * 24
        private const val THREE_DAY_MILLIS: Long = 3 * DAY_MILLIS
        private const val SHORTEST_MONTH_MILLIS: Long = DAY_MILLIS * 28

        // Note this is 8 so that recording of FirstWeekSeriesActivity happens throughout the length
        // of the 7th day after install
        private const val FULL_WEEK_MILLIS: Long = DAY_MILLIS * 8

        // The usage threshold we are interested in is currently 340 seconds.
        private const val USAGE_THRESHOLD_MILLIS = 1000 * 340

        // The usage threshold for "activated" growth users.
        private const val DAYS_ACTIVATED_THREASHOLD = 3

        /**
         * Determines whether events should be tracked based on some general criteria:
         * - user has installed as a result of a campaign
         * - tracking is still enabled through Nimbus
         */
        fun shouldSendGenerally(context: Context): Boolean {
            return context.settings().adjustCampaignId.isNotEmpty() &&
                FxNimbus.features.growthData.value().enabled
        }

        fun getInstalledTime(context: Context): Long = context.packageManager
            .getPackageInfoCompat(context.packageName, 0)
            .firstInstallTime
    }
}
