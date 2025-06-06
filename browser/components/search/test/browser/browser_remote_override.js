/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests that a configuration supplied by search-config-overrides-v2 is
 * correctly applied to the search engine, and that the searchWith ping is
 * sent.
 */

const TEST_CONFIG = [
  {
    identifier: "override",
    recordType: "engine",
    base: {
      classification: "unknown",
      name: "override name",
      partnerCode: "old-pc",
      urls: {
        search: {
          base: "https://www.example.com/search",
          params: [
            { name: "old_param", value: "old_value" },
            { name: "pc", value: "{partnerCode}" },
          ],
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { allRegionsAndLocales: true },
      },
    ],
  },
  {
    recordType: "defaultEngines",
    globalDefault: "basic",
    specificDefaults: [],
  },
  {
    recordType: "engineOrders",
    orders: [],
  },
];

const TEST_CONFIG_OVERRIDE = [
  {
    identifier: "override",
    urls: {
      search: {
        params: [
          { name: "new_param", value: "new_value" },
          { name: "pc", value: "{partnerCode}" },
        ],
      },
    },
    partnerCode: "new_partner_code",
    telemetrySuffix: "tsfx",
    clickUrl: "https://example.org/somewhere",
  },
];

SearchTestUtils.init(this);

add_setup(async () => {
  await SearchTestUtils.updateRemoteSettingsConfig(
    TEST_CONFIG,
    TEST_CONFIG_OVERRIDE
  );
  Services.fog.testResetFOG();

  // Sanity check that the search engine is set as default.
  Assert.equal(
    Services.search.defaultEngine.identifier,
    "override-tsfx",
    "Should have the expected engine set as default"
  );
});

add_task(async function test_remote_override() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "test",
  });
  let matchCount = UrlbarTestUtils.getResultCount(window);
  Assert.greaterOrEqual(
    matchCount,
    1,
    "Should have at least one item in the results"
  );

  await GleanPings.searchWith.testSubmission(
    () => {
      Assert.equal(
        Glean.searchWith.reportingUrl.testGetValue(),
        "https://example.org/somewhere",
        "Should have recorded the reporting URL"
      );
      Assert.equal(
        Glean.searchWith.contextId.testGetValue().length,
        36,
        "Should have sent a context id with the ping"
      );
    },
    async () => {
      let loadPromise = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
      EventUtils.sendKey("return");
      await loadPromise;
    }
  );

  Assert.equal(
    tab.linkedBrowser.currentURI.spec,
    "https://www.example.com/search?new_param=new_value&pc=new_partner_code&q=test",
    "Should have loaded the page with the overridden parameters"
  );

  BrowserTestUtils.removeTab(tab);
});
