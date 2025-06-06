// Copyright 2015 Jordan Harband.  All rights reserved.
// See LICENSE for details.

/*---
es6id: 25.4.4.4_A1.2_T1
author: Jordan Harband
description: Promise.reject property descriptor
info: |
    ES6 Section 17

    Every other data property described in clauses 18 through 26 and in Annex
    B.2 has the attributes { [[Writable]]: true, [[Enumerable]]: false,
    [[Configurable]]: true } unless otherwise specified.
includes: [propertyHelper.js]
---*/

verifyProperty(Promise, 'reject', {
  writable: true,
  enumerable: false,
  configurable: true
});

reportCompare(0, 0);
