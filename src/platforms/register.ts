/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { registerClubhouseAdapter } from './clubhouse/index.js'

/**
 * Registers built-in platform adapters. Must run before any
 * `createPlatformAdapter` call (HTTP handlers, BotManager.startAll).
 */
export const registerBuiltinAdapters = (): void => {
  registerClubhouseAdapter()
}
