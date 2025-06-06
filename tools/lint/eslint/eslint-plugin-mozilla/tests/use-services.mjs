/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

import rule from "../lib/rules/use-services.mjs";
import { RuleTester } from "eslint";

const ruleTester = new RuleTester();

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

function invalidCode(code, serviceName, getterName, type = "CallExpression") {
  return {
    code,
    errors: [
      { messageId: "useServices", data: { serviceName, getterName }, type },
    ],
  };
}

ruleTester.run("use-services", rule, {
  valid: [
    'Cc["@mozilla.org/fakeservice;1"].getService(Ci.nsIFake)',
    'Components.classes["@mozilla.org/fakeservice;1"].getService(Components.interfaces.nsIFake)',
    "Services.wm.addListener()",
  ],
  invalid: [
    invalidCode(
      'Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);',
      "wm",
      "getService()"
    ),
    invalidCode(
      'Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup);',
      "startup",
      "getService()"
    ),
    invalidCode(
      `XPCOMUtils.defineLazyServiceGetters(this, {
         uuidGen: ["@mozilla.org/uuid-generator;1", "nsIUUIDGenerator"],
       });`,
      "uuid",
      "defineLazyServiceGetters",
      "ArrayExpression"
    ),
    invalidCode(
      `XPCOMUtils.defineLazyServiceGetter(
         this,
         "gELS",
         "@mozilla.org/eventlistenerservice;1",
         "nsIEventListenerService"
       );`,
      "els",
      "defineLazyServiceGetter"
    ),
  ],
});
