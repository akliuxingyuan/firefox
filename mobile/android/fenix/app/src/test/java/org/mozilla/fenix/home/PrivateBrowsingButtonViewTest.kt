/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.home

import android.widget.ToggleButton
import androidx.core.view.isVisible
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import org.mozilla.fenix.R
import org.mozilla.fenix.browser.browsingmode.BrowsingMode
import org.mozilla.fenix.browser.browsingmode.BrowsingModeManager

class PrivateBrowsingButtonViewTest {

    private lateinit var button: ToggleButton
    private lateinit var browsingModeManager: BrowsingModeManager

    @Before
    fun setup() {
        button = mockk(relaxed = true)
        browsingModeManager = mockk(relaxed = true)

        every { browsingModeManager.mode } returns BrowsingMode.Normal
    }

    @Test
    fun `WHEN constructing PrivateBrowsingButtonView THEN correctly sets click listener`() {
        val view = PrivateBrowsingButtonView(
            button = button,
            showPrivateBrowsingButton = true,
            browsingModeManager = browsingModeManager,
        ) {}
        verify { button.isVisible = true }
        verify { button.context.getString(R.string.content_description_private_browsing_button) }
        verify { button.setOnClickListener(view) }

        every { browsingModeManager.mode } returns BrowsingMode.Private
        val privateView = PrivateBrowsingButtonView(
            button = button,
            showPrivateBrowsingButton = false,
            browsingModeManager = browsingModeManager,
        ) {}
        verify { button.isVisible = false }
        verify { button.setOnClickListener(privateView) }
    }

    @Test
    fun `click listener calls onClick with inverted mode from normal mode`() {
        every { browsingModeManager.mode } returns BrowsingMode.Normal
        var mode: BrowsingMode? = null
        val view = PrivateBrowsingButtonView(
            button = button,
            showPrivateBrowsingButton = true,
            browsingModeManager = browsingModeManager,
        ) { mode = it }

        view.onClick(button)

        assertEquals(BrowsingMode.Private, mode)
    }

    @Test
    fun `click listener calls onClick with inverted mode from private mode`() {
        every { browsingModeManager.mode } returns BrowsingMode.Private
        var mode: BrowsingMode? = null
        val view = PrivateBrowsingButtonView(
            button = button,
            showPrivateBrowsingButton = true,
            browsingModeManager = browsingModeManager,
        ) { mode = it }

        view.onClick(button)

        assertEquals(BrowsingMode.Normal, mode)
    }
}
