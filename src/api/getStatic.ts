/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import fetch from 'cross-fetch'
import qs from 'qs'
import type { Profile } from '../types/config'

interface GetStaticOptions {
  headers?: Record<string, string>
  body?: unknown
  query?: Record<string, unknown> | string
  method?: string
}

const getStatic = async (profile: Profile, url?: string, options?: GetStaticOptions): Promise<Response> => {
  'use strict'

  let finalUrl = url ?? ''
  const headers: Record<string, string> = options?.headers ?? {}

  headers['User-Agent'] = profile.userAgentStatic ?? 'Clubhouse/297 CFNetwork/1220.1 Darwin/20.3.0'
  headers.Accept = 'application/json'
  headers['Accept-Encoding'] = profile.acceptEncodings ?? 'gzip, deflate, br'
  headers['Accept-Language'] = profile.acceptLanguages ?? 'ko-KR;q=1'
  headers.Connection = 'keep-alive'

  let body: BodyInit | undefined
  let method = options?.method

  if (options?.body && typeof options.body === 'object') {
    method = 'POST'
    headers['Content-Type'] = 'application/json; charset=utf-8'
    body = JSON.stringify(options.body)
  }

  if (options?.query) {
    let queryString = options.query
    if (typeof queryString === 'object') {
      queryString = qs.stringify(queryString)
    }

    finalUrl += '?' + queryString
  }

  return await fetch(finalUrl, { headers, body, method })
}

export default getStatic
