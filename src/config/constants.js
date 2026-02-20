/**
 * Application constants to eliminate magic numbers and improve maintainability
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

// Time constants (in milliseconds)
const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  THREE_MINUTES: 3 * 60 * 1000,
  THREE_SECONDS: 3 * 1000,
  FIFTEEN_SECONDS: 15 * 1000,
};

// Message limits
const MESSAGE_LIMITS = {
  MAX_RESPONSE_LENGTH: 270,
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  INTERNAL_SERVER_ERROR: 500,
};

// Clubhouse API constants
const CLUBHOUSE = {
  APP_VERSION: '23.02.07',
  APP_BUILD: '2029',
  USER_AGENT: 'clubhouse/2029 (iPhone; iOS 16.3; Scale/3.00)',
  ACCEPT_LANGUAGE: 'en-US;q=1',
};

// Content types
const CONTENT_TYPES = {
  JSON: 'application/json; charset=utf-8',
};

module.exports = {
  TIME,
  MESSAGE_LIMITS,
  HTTP_STATUS,
  CLUBHOUSE,
  CONTENT_TYPES,
};