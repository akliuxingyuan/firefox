// |reftest| shell-option(--enable-temporal) skip-if(!this.hasOwnProperty('Temporal')||!xulRuntime.shell) -- Temporal is not enabled unconditionally, requires shell-options
// Copyright (C) 2022 Igalia S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plaindate.compare
description: >
  RangeError thrown if an invalid ISO string (or syntactically valid ISO string
  that is not supported) is used as a PlainDate
features: [Temporal, arrow-function]
---*/

const invalidStrings = [
  // invalid ISO strings:
  "",
  "invalid iso8601",
  "2020-01-00",
  "2020-01-32",
  "2020-02-30",
  "2021-02-29",
  "2020-00-01",
  "2020-13-01",
  "2020-01-01T",
  "2020-01-01T25:00:00",
  "2020-01-01T01:60:00",
  "2020-01-01T01:60:61",
  "2020-01-01junk",
  "2020-01-01T00:00:00junk",
  "2020-01-01T00:00:00+00:00junk",
  "2020-01-01T00:00:00+00:00[UTC]junk",
  "2020-01-01T00:00:00+00:00[UTC][u-ca=iso8601]junk",
  "02020-01-01",
  "2020-001-01",
  "2020-01-001",
  "2020-01-01T001",
  "2020-01-01T01:001",
  "2020-01-01T01:01:001",
  // valid, but forms not supported in Temporal:
  "2020-W01-1",
  "2020-001",
  "+0002020-01-01",
  // valid, but this calendar must not exist:
  "2020-01-01[u-ca=notexist]",
  // may be valid in other contexts, but insufficient information for PlainDate:
  "2020-01",
  "+002020-01",
  "01-01",
  "2020-W01",
  "P1Y",
  "-P12Y",
  // valid, but outside the supported range:
  "-999999-01-01",
  "+999999-01-01",
];
const other = new Temporal.PlainDate(2020, 1, 1);
for (const arg of invalidStrings) {
  assert.throws(
    RangeError,
    () => Temporal.PlainDate.compare(arg, other),
    `"${arg}" should not be a valid ISO string for a PlainDate (first argument)`
  );
  assert.throws(
    RangeError,
    () => Temporal.PlainDate.compare(other, arg),
    `"${arg}" should not be a valid ISO string for a PlainDate (second argument)`
  );
}

reportCompare(0, 0);
