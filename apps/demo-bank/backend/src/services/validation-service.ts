/**
 * BUG #4: Timezone bug
 *
 * This function checks if the current time is within business hours (9 AM - 5 PM).
 * However, it mixes local time and UTC time in its comparison.
 */
export function isBusinessHours() {
  // DEMO MODE: bypass the timezone bug so other bugs can be triggered
  if (process.env.RADIATOR_DEMO_MODE) return true;

  const now = new Date();

  // BUG: Mixing local time and UTC time
  const currentHourLocal = now.getHours();
  const currentHourUTC = now.getUTCHours();

  // Uses local hour for opening check but UTC hour for closing check
  const isAfterOpening = currentHourLocal >= 9;
  const isBeforeClosing = currentHourUTC <= 17;

  return isAfterOpening && isBeforeClosing;
}

/**
 * Validates that a transfer description meets requirements.
 */
export function validateDescription(description) {
  if (!description || description.trim().length === 0) {
    return false;
  }
  if (description.length > 200) {
    return false;
  }
  return true;
}

/**
 * Validates account ID format.
 */
export function validateAccountId(id) {
  return /^acc-[a-zA-Z0-9]+$/.test(id);
}
