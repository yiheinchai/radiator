"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isBusinessHours = isBusinessHours;
exports.validateAccountId = validateAccountId;
exports.validateDescription = validateDescription;
var _client = require("@radiator/client");
/**
 * BUG #4: Timezone bug
 *
 * This function checks if the current time is within business hours (9 AM - 5 PM).
 * However, it mixes local time and UTC time in its comparison.
 */
function isBusinessHours() {
  try {
    (0, _client.enterFunction)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", "isBusinessHours", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/validation-service.ts");
    // DEMO MODE: bypass the timezone bug so other bugs can be triggered
    if (process.env.RADIATOR_DEMO_MODE) return true;
    const now = new Date();

    // BUG: Mixing local time and UTC time
    (0, _client.capture)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", "now", now, {
      line: 11,
      column: 2
    });
    const currentHourLocal = now.getHours();
    (0, _client.capture)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", "currentHourLocal", currentHourLocal, {
      line: 14,
      column: 2
    });
    const currentHourUTC = now.getUTCHours();

    // Uses local hour for opening check but UTC hour for closing check
    (0, _client.capture)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", "currentHourUTC", currentHourUTC, {
      line: 15,
      column: 2
    });
    const isAfterOpening = currentHourLocal >= 9;
    (0, _client.capture)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", "isAfterOpening", isAfterOpening, {
      line: 18,
      column: 2
    });
    const isBeforeClosing = currentHourUTC <= 17;
    (0, _client.capture)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", "isBeforeClosing", isBeforeClosing, {
      line: 19,
      column: 2
    });
    {
      const __rad_ret = isAfterOpening && isBeforeClosing;
      (0, _client.captureReturn)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("23b09026f5c6f6b835e138b973d336eaadaed19bc3b51dbcc1d96be5014a4171");
  }
}

/**
 * Validates that a transfer description meets requirements.
 */
function validateDescription(description) {
  try {
    (0, _client.enterFunction)("9aaad84bba03b4c77de14df90392c40f89f7cdc8ad8aaa660b13cc1c4a162ced", "validateDescription", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/validation-service.ts");
    (0, _client.capture)("9aaad84bba03b4c77de14df90392c40f89f7cdc8ad8aaa660b13cc1c4a162ced", "description", description, {
      line: 0,
      column: 0
    });
    if (!description || description.trim().length === 0) {
      return false;
    }
    if (description.length > 200) {
      return false;
    }
    {
      const __rad_ret = true;
      (0, _client.captureReturn)("9aaad84bba03b4c77de14df90392c40f89f7cdc8ad8aaa660b13cc1c4a162ced", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("9aaad84bba03b4c77de14df90392c40f89f7cdc8ad8aaa660b13cc1c4a162ced", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("9aaad84bba03b4c77de14df90392c40f89f7cdc8ad8aaa660b13cc1c4a162ced");
  }
}

/**
 * Validates account ID format.
 */
function validateAccountId(id) {
  try {
    (0, _client.enterFunction)("4e42ac4fdf12e36bc95a0d1bd0a1969f7479299128ea0d44143eb57c2653077d", "validateAccountId", "/Users/yihein.chai/Documents/learn/rad/apps/demo-bank/backend/src/services/validation-service.ts");
    (0, _client.capture)("4e42ac4fdf12e36bc95a0d1bd0a1969f7479299128ea0d44143eb57c2653077d", "id", id, {
      line: 0,
      column: 0
    });
    {
      const __rad_ret = /^acc-[a-zA-Z0-9]+$/.test(id);
      (0, _client.captureReturn)("4e42ac4fdf12e36bc95a0d1bd0a1969f7479299128ea0d44143eb57c2653077d", __rad_ret);
      return __rad_ret;
    }
  } catch (__rad_err) {
    (0, _client.onError)("4e42ac4fdf12e36bc95a0d1bd0a1969f7479299128ea0d44143eb57c2653077d", __rad_err);
    throw __rad_err;
  } finally {
    (0, _client.exitFunction)("4e42ac4fdf12e36bc95a0d1bd0a1969f7479299128ea0d44143eb57c2653077d");
  }
}