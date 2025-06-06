// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2022 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plaintime.prototype.round
description: Tests calculations with roundingMode "expand".
includes: [temporalHelpers.js]
features: [Temporal]
---*/

const instance = new Temporal.PlainTime(13, 46, 23, 123, 987, 500);

const expected = [
  ["hour", [14]],
  ["minute", [13, 47]],
  ["second", [13, 46, 24]],
  ["millisecond", [13, 46, 23, 124]],
  ["microsecond", [13, 46, 23, 123, 988]],
  ["nanosecond", [13, 46, 23, 123, 987, 500]],
];

const roundingMode = "expand";

expected.forEach(([smallestUnit, expected]) => {
  const [h, min = 0, s = 0, ms = 0, µs = 0, ns = 0] = expected;
  TemporalHelpers.assertPlainTime(
    instance.round({ smallestUnit, roundingMode }),
    h, min, s, ms, µs, ns,
    `rounds to ${smallestUnit} (roundingMode = ${roundingMode})`
  );
});

reportCompare(0, 0);
