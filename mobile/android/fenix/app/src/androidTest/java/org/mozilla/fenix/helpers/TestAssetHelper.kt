/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.fenix.helpers

import android.net.Uri
import androidx.core.net.toUri
import okhttp3.mockwebserver.MockWebServer
import java.util.concurrent.TimeUnit

/**
 * Helper for hosting web pages locally for testing purposes.
 */
object TestAssetHelper {
    @Suppress("MagicNumber")
    val waitingTime: Long = TimeUnit.SECONDS.toMillis(15)
    val waitingTimeLong = TimeUnit.SECONDS.toMillis(25)
    val waitingTimeShort: Long = TimeUnit.SECONDS.toMillis(3)
    val waitingTimeVeryShort: Long = TimeUnit.SECONDS.toMillis(1)

    data class TestAsset(val url: Uri, val content: String, val title: String)

    /**
     * Hosts 3 simple websites, found at androidTest/assets/pages/generic[1|2|3].html
     * Returns a list of TestAsset, which can be used to navigate to each and
     * assert that the correct information is being displayed.
     *
     * Content for these pages all follow the same pattern. See [generic1.html] for
     * content implementation details.
     */
    fun getGenericAssets(server: MockWebServer): List<TestAsset> {
        @Suppress("MagicNumber")
        return (1..4).map {
            TestAsset(
                server.url("pages/generic$it.html").toString().toUri()!!,
                "Page content: $it",
                "Test_Page_$it",
            )
        }
    }

    fun getGenericAsset(server: MockWebServer, pageNum: Int): TestAsset {
        val url = server.url("pages/generic$pageNum.html").toString().toUri()!!
        val content = "Page content: $pageNum"
        val title = "Test_Page_$pageNum"

        return TestAsset(url, content, title)
    }

    fun getLoremIpsumAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/lorem-ipsum.html").toString().toUri()!!
        val content = "Page content: lorem ipsum"
        val title = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt"

        return TestAsset(url, content, title)
    }

    fun getRefreshAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/refresh.html").toString().toUri()!!
        val content = "Page content: refresh"

        return TestAsset(url, content, "")
    }

    fun getUUIDPage(server: MockWebServer): TestAsset {
        val url = server.url("pages/basic_nav_uuid.html").toString().toUri()!!
        val content = "Page content: basic_nav_uuid"

        return TestAsset(url, content, "")
    }

    fun getEnhancedTrackingProtectionAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/trackingPage.html").toString().toUri()!!
        val content = "Level 1 (Basic) List"

        return TestAsset(url, content, "")
    }

    fun getImageAsset(server: MockWebServer): TestAsset {
        val url = server.url("resources/rabbit.jpg").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getPdfFormAsset(server: MockWebServer): TestAsset {
        val url = server.url("resources/pdfForm.pdf").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getSaveLoginAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/password.html").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getAddressFormAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/addressForm.html").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getCreditCardFormAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/creditCardForm.html").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getHTMLControlsFormAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/htmlControls.html").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getExternalLinksAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/externalLinks.html").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getAudioPageAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/audioMediaPage.html").toString().toUri()!!
        val title = "Audio_Test_Page"
        val content = "Page content: audio player"

        return TestAsset(url, content, title)
    }

    fun getVideoPageAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/videoMediaPage.html").toString().toUri()!!
        val title = "Video_Test_Page"
        val content = "Page content: video player"

        return TestAsset(url, content, title)
    }

    fun getMutedVideoPageAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/mutedVideoPage.html").toString().toUri()!!
        val title = "Muted_Video_Test_Page"
        val content = "Page content: muted video player"

        return TestAsset(url, content, title)
    }

    fun getStorageTestAsset(server: MockWebServer, pageAsset: String): TestAsset {
        val url = server.url("pages/$pageAsset").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getGPCTestAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/global_privacy_control.html").toString().toUri()!!

        return TestAsset(url, "", "")
    }

    fun getTextFragmentAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/textFragment.html").toString().toUri()!!
        val title = "Text_Fragment"

        return TestAsset(url, "", title)
    }

    fun getPromptAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/beforeUnload.html").toString().toUri()!!
        val title = "BeforeUnload_Test_Page"

        return TestAsset(url, "", title)
    }

    fun getFirstForeignWebPageAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/firstForeignWebPage.html").toString().toUri()!!
        val title = "Page_de_test_FR_1"
        val content = "Article du jour"

        return TestAsset(url, content, title)
    }

    fun getSecondForeignWebPageAsset(server: MockWebServer): TestAsset {
        val url = server.url("pages/secondForeignWebPage.html").toString().toUri()!!
        val title = "Page_de_test_FR_2"
        val content = "Mot du jour"

        return TestAsset(url, content, title)
    }
}
