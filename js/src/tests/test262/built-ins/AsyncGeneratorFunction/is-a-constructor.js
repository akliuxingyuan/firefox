// Copyright (C) 2020 Rick Waldron. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-ecmascript-standard-built-in-objects
description: >
  The AsyncGeneratorFunction constructor implements [[Construct]]
info: |
  IsConstructor ( argument )

  The abstract operation IsConstructor takes argument argument (an ECMAScript language value).
  It determines if argument is a function object with a [[Construct]] internal method.
  It performs the following steps when called:

  If Type(argument) is not Object, return false.
  If argument has a [[Construct]] internal method, return true.
  Return false.
includes: [isConstructor.js, wellKnownIntrinsicObjects.js]
features: [Reflect.construct]
---*/

var AsyncGeneratorFunction = getWellKnownIntrinsicObject('%AsyncGeneratorFunction%');
assert.sameValue(
  isConstructor(AsyncGeneratorFunction),
  true,
  'isConstructor(AsyncGeneratorFunction) must return true'
);
new AsyncGeneratorFunction();

reportCompare(0, 0);
