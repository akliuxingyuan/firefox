/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import rule from "../lib/rules/balanced-listeners.mjs";
import { RuleTester } from "eslint";

const ruleTester = new RuleTester();

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

function error(code, functionName, type) {
  return {
    code,
    errors: [
      {
        messageId: "noCorresponding",
        type: "Identifier",
        data: { functionName, type },
      },
    ],
  };
}

ruleTester.run("balanced-listeners", rule, {
  valid: [
    "elt.addEventListener('event', handler);" +
      "elt.removeEventListener('event', handler);",

    "elt.addEventListener('event', handler, true);" +
      "elt.removeEventListener('event', handler, true);",

    "elt.addEventListener('event', handler, false);" +
      "elt.removeEventListener('event', handler, false);",

    "elt.addEventListener('event', handler);" +
      "elt.removeEventListener('event', handler, false);",

    "elt.addEventListener('event', handler, false);" +
      "elt.removeEventListener('event', handler);",

    "elt.addEventListener('event', handler, {capture: false});" +
      "elt.removeEventListener('event', handler);",

    "elt.addEventListener('event', handler);" +
      "elt.removeEventListener('event', handler, {capture: false});",

    "elt.addEventListener('event', handler, {capture: true});" +
      "elt.removeEventListener('event', handler, true);",

    "elt.addEventListener('event', handler, true);" +
      "elt.removeEventListener('event', handler, {capture: true});",

    "elt.addEventListener('event', handler, {once: true});",

    "elt.addEventListener('event', handler, {once: true, capture: true});",
  ],
  invalid: [
    error(
      "elt.addEventListener('click', handler, false);",
      "removeEventListener",
      "click"
    ),

    error(
      "elt.addEventListener('click', handler, false);" +
        "elt.removeEventListener('click', handler, true);",
      "removeEventListener",
      "click"
    ),

    error(
      "elt.addEventListener('click', handler, {capture: false});" +
        "elt.removeEventListener('click', handler, true);",
      "removeEventListener",
      "click"
    ),

    error(
      "elt.addEventListener('click', handler, {capture: true});" +
        "elt.removeEventListener('click', handler);",
      "removeEventListener",
      "click"
    ),

    error(
      "elt.addEventListener('click', handler, true);" +
        "elt.removeEventListener('click', handler);",
      "removeEventListener",
      "click"
    ),
  ],
});
