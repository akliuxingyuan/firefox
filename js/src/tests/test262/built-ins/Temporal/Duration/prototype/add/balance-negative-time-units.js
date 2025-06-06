// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.duration.prototype.add
description: Negative time fields are balanced upwards
includes: [temporalHelpers.js]
features: [Temporal]
---*/

const duration = new Temporal.Duration(0, 0, 0, 0, 1, 1, 1, 1, 1, 1);

const result1 = duration.add(new Temporal.Duration(0, 0, 0, 0, 0, 0, 0, 0, 0, -2));
TemporalHelpers.assertDuration(result1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 999, "nanoseconds balance");

const result2 = duration.add(new Temporal.Duration(0, 0, 0, 0, 0, 0, 0, 0, -2));
TemporalHelpers.assertDuration(result2, 0, 0, 0, 0, 1, 1, 1, 0, 999, 1, "microseconds balance");

const result3 = duration.add(new Temporal.Duration(0, 0, 0, 0, 0, 0, 0, -2));
TemporalHelpers.assertDuration(result3, 0, 0, 0, 0, 1, 1, 0, 999, 1, 1, "milliseconds balance");

const result4 = duration.add(new Temporal.Duration(0, 0, 0, 0, 0, 0, -2));
TemporalHelpers.assertDuration(result4, 0, 0, 0, 0, 1, 0, 59, 1, 1, 1, "seconds balance");

const result5 = duration.add(new Temporal.Duration(0, 0, 0, 0, 0, -2));
TemporalHelpers.assertDuration(result5, 0, 0, 0, 0, 0, 59, 1, 1, 1, 1, "minutes balance");

const result6 = duration.add(new Temporal.Duration(0, 0, 0, 0, -2));
TemporalHelpers.assertDuration(result6, 0, 0, 0, 0, 0, -58, -58, -998, -998, -999, "hours balance");

reportCompare(0, 0);
