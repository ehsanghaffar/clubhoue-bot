/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import { Profile } from '../config'

type ClubhouseApiResult<T> = ({ success: true } & T) | { success: false, error_message: string }

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export declare class Client {
  constructor (options: { profile: Profile })
  [k: string]: <T>(...params: unknown[]) => Promise<ClubhouseApiResult<T>>
}
