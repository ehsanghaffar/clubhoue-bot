/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import fetch from 'cross-fetch'
import qs from 'qs'
import { v4 as uuidv4 } from 'uuid'
import type { AgentCustoms, AgentFunction } from '../types/services.js'

const agent: AgentFunction = async (
  url: string,
  options?: { body?: Record<string, unknown>, query?: Record<string, unknown> | string, headers?: Record<string, string> },
  customs?: AgentCustoms
): Promise<Response> => {
  'use strict'

  const finalUrl =
    (customs?.apiRoot ?? 'https://www.clubhouseapi.com/api') + (url ?? '')

  const opts: Record<string, unknown> = options ?? {}
  const customOpts = customs ?? {}

  const headers: Record<string, string> = (opts.headers as Record<string, string>) ?? {}

  headers['User-Agent'] =
    customOpts.userAgent ?? 'clubhouse/2029 (iPhone; iOS 16.3; Scale/3.00)'
  headers['CH-Languages'] = customOpts.languages ?? 'en-US'
  headers['CH-Locale'] = customOpts.locale ?? 'en_US'
  headers['CH-AppVersion'] = customOpts.appVersion ?? '23.02.07'
  headers['CH-AppBuild'] = customOpts.appBuild ?? '2029'
  headers['CH-DeviceId'] = customOpts.deviceId ?? uuidv4().toUpperCase()
  headers['CH-UserID'] = customOpts.userId ?? '(null)'

  if (customOpts.token) {
    headers.Authorization = 'Token ' + customOpts.token
  }

  headers.Accept = customOpts.accept ?? 'application/json'
  headers['Accept-Encoding'] = customOpts.acceptEncodings ?? 'gzip, deflate, br'
  headers['Accept-Language'] = customOpts.acceptLanguages ?? 'en-US;q=1'
  headers.Connection = 'keep-alive'
  headers.Host = 'www.clubhouseapi.com'

  opts.headers = headers

  const bodyData = opts.body
  if (!customOpts._preventBodySerialization && typeof bodyData === 'object' && bodyData !== null) {
    opts.method = 'POST';
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json; charset=utf-8'
    opts.body = JSON.stringify(bodyData)
  }

  if (opts.query) {
    let queryString = opts.query
    if (typeof queryString === 'object') {
      queryString = qs.stringify(queryString)
    }
    const urlWithQuery = finalUrl + '?' + queryString
    delete opts.query

    const finalOpts: RequestInit = {
      ...opts,
      method: opts.method as string,
      headers: opts.headers as Record<string, string>,
      body: opts.body as string,
      ...(customOpts.fetchOptions ?? {})
    }

    return await fetch(urlWithQuery, finalOpts)
  }

  const finalOpts: RequestInit = {
    ...opts,
    method: opts.method as string,
    headers: opts.headers as Record<string, string>,
    body: opts.body as string,
    ...(customOpts.fetchOptions ?? {})
  }

  return await fetch(finalUrl, finalOpts)
}

export default agent
