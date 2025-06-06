/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(2);

// Import helpers
Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/dom/base/test/fullscreen/fullscreen_helpers.js",
  this
);

add_setup(async function () {
  await pushPrefs(
    ["test.wait300msAfterTabSwitch", true],
    ["full-screen-api.transition-duration.enter", "0 0"],
    ["full-screen-api.transition-duration.leave", "0 0"],
    ["full-screen-api.allow-trusted-requests-only", false]
  );
});

TEST_URLS.forEach(url => {
  add_task(async () => {
    info(`url: ${url}`);
    await BrowserTestUtils.withNewTab(
      {
        gBrowser,
        url,
      },
      async function (browser) {
        let promiseFsState = waitForFullscreenState(document, true);
        // Trigger click event in inner most iframe
        SpecialPowers.spawn(
          browser.browsingContext.children[0].children[0],
          [],
          function () {
            content.setTimeout(() => {
              content.document.getElementById("div").click();
            }, 0);
          }
        );
        await promiseFsState;

        let promiseFsExit = waitForFullscreenExit(document, false);
        // This should exit fullscreen
        let tab = gBrowser.getTabForBrowser(browser);
        BrowserTestUtils.removeTab(tab);
        await promiseFsExit;

        // Ensure the browser exits fullscreen state.
        ok(!window.fullScreen, "The chrome window should not be in fullscreen");
        ok(
          !document.documentElement.hasAttribute("inDOMFullscreen"),
          "The chrome document should not be in fullscreen"
        );
      }
    );
  });
});
