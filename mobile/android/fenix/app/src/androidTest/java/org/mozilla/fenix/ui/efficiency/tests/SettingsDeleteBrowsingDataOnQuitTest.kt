package org.mozilla.fenix.ui.efficiency.tests

import org.junit.Test
import org.mozilla.fenix.ui.efficiency.helpers.BaseTest

class SettingsDeleteBrowsingDataOnQuitTest : BaseTest() {

    @Test
    fun verifyTheDeleteBrowsingDataOnQuitSectionTest() {
        on.settingsDeleteBrowsingDataOnQuit.navigateToPage()
    }
}
