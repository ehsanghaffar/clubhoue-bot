/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import fetch from 'cross-fetch'
import { Profile } from '../config'

declare function agent (url: string, options: unknown, customs: Profile): ReturnType<typeof fetch>
export default agent
