// utils.js
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i;

/**
 * Validate that a string is a valid UUID (version 1-5).
 */
const isValidUUID = (str) => typeof str === 'string' && UUID_REGEX.test(str);

const safeUUID = (val) => typeof val === 'string' && /^[0-9a-f-]{36}$/i.test(val) ? val : null;

module.exports = {
  isValidUUID,
  safeUUID,
};
