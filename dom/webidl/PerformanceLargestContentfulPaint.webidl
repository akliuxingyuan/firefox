/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/largest-contentful-paint/
 *
 * Copyright © 2012 W3C® (MIT, ERCIM, Keio), All Rights Reserved. W3C
 * liability, trademark and document use rules apply.
 */

[Pref="dom.enable_largest_contentful_paint",
 Exposed=Window]
interface LargestContentfulPaint : PerformanceEntry {
    readonly attribute DOMHighResTimeStamp renderTime;
    readonly attribute DOMHighResTimeStamp loadTime;
    readonly attribute unsigned long size;
    readonly attribute DOMString id;
    readonly attribute DOMString url;
    readonly attribute Element? element;
    [Default] object toJSON();
};

LargestContentfulPaint includes PaintTimingMixin;
