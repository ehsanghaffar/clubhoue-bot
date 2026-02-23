/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
export const TIME = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  THREE_MINUTES: 3 * 60 * 1000,
  THREE_SECONDS: 3 * 1000,
  FIFTEEN_SECONDS: 15 * 1000,
} as const;

export const MESSAGE_LIMITS = {
  MAX_RESPONSE_LENGTH: 270,
} as const;

export const HTTP_STATUS = {
  OK: 200,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const CLUBHOUSE = {
  APP_VERSION: '23.02.07',
  APP_BUILD: '2029',
  USER_AGENT: 'clubhouse/2029 (iPhone; iOS 16.3; Scale/3.00)',
  ACCEPT_LANGUAGE: 'en-US;q=1',
} as const;

export const CONTENT_TYPES = {
  JSON: 'application/json; charset=utf-8',
} as const;
