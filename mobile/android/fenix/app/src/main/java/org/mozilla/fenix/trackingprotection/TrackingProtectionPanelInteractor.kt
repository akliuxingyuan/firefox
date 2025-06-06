/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.trackingprotection

import android.content.Context
import androidx.fragment.app.Fragment
import androidx.navigation.NavController
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import mozilla.components.browser.state.state.SessionState
import mozilla.components.concept.engine.cookiehandling.CookieBannersStorage
import mozilla.components.concept.engine.permission.SitePermissions
import mozilla.components.support.ktx.kotlin.isContentUrl
import org.mozilla.fenix.browser.BrowserFragmentDirections
import org.mozilla.fenix.ext.components
import org.mozilla.fenix.ext.runIfFragmentIsAttached
import org.mozilla.fenix.settings.quicksettings.protections.cookiebanners.getCookieBannerUIMode

/**
 * Interactor for the tracking protection panel
 * Provides implementations for the TrackingProtectionPanelViewInteractor
 */
@Suppress("LongParameterList")
class TrackingProtectionPanelInteractor(
    private val context: Context,
    private val fragment: Fragment,
    private val store: ProtectionsStore,
    private val ioScope: CoroutineScope,
    private val cookieBannersStorage: CookieBannersStorage,
    private val navController: () -> NavController,
    private val openTrackingProtectionSettings: () -> Unit,
    private val openLearnMoreLink: () -> Unit,
    internal var sitePermissions: SitePermissions?,
    private val gravity: Int,
    private val getCurrentTab: () -> SessionState?,
) : TrackingProtectionPanelViewInteractor {

    override fun openDetails(category: TrackingProtectionCategory, categoryBlocked: Boolean) {
        store.dispatch(ProtectionsAction.EnterDetailsMode(category, categoryBlocked))
    }

    override fun onLearnMoreClicked() {
        openLearnMoreLink()
    }

    override fun selectTrackingProtectionSettings() {
        openTrackingProtectionSettings.invoke()
    }
    override fun onBackPressed() {
        getCurrentTab()?.let { tab ->
            context.components.useCases.trackingProtectionUseCases.containsException(tab.id) { contains ->
                ioScope.launch {
                    val cookieBannerUIMode = cookieBannersStorage.getCookieBannerUIMode(
                        context,
                        tab,
                    )
                    withContext(Dispatchers.Main) {
                        fragment.runIfFragmentIsAttached {
                            navController().popBackStack()
                            val isTrackingProtectionEnabled =
                                tab.trackingProtection.enabled && !contains
                            val directions =
                                BrowserFragmentDirections.actionGlobalQuickSettingsSheetDialogFragment(
                                    sessionId = tab.id,
                                    url = tab.content.url,
                                    title = tab.content.title,
                                    isLocalPdf = tab.content.url.isContentUrl(),
                                    isSecured = tab.content.securityInfo.secure,
                                    sitePermissions = sitePermissions,
                                    gravity = gravity,
                                    certificateName = tab.content.securityInfo.issuer,
                                    permissionHighlights = tab.content.permissionHighlights,
                                    isTrackingProtectionEnabled = isTrackingProtectionEnabled,
                                    cookieBannerUIMode = cookieBannerUIMode,
                                )
                            navController().navigate(directions)
                        }
                    }
                }
            }
        }
    }

    override fun onExitDetailMode() {
        store.dispatch(ProtectionsAction.ExitDetailsMode)
    }
}
