/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import fetch from 'cross-fetch';
import { v4 as uuidv4 } from 'uuid';
import type { AgentCustoms, AgentFunction } from '../types/services';

let persistentDeviceId: string | undefined;

const buildUrl = (baseUrl: string, query?: Record<string, unknown> | string): string => {
  if (!query) {
    return baseUrl;
  }

  const url = new URL(baseUrl, 'http://localhost');
  const queryParams = new URLSearchParams();

  if (typeof query === 'string') {
    const parsedQuery = new URLSearchParams(query);
    parsedQuery.forEach((value, key) => queryParams.append(key, value));
  } else {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => queryParams.append(key, String(item)));
        return;
      }

      queryParams.append(key, String(value));
    });
  }

  queryParams.forEach((value, key) => {
    url.searchParams.append(key, value);
  });

  return url.toString().replace(/^http:\/\/localhost/, '');
};

const agent: AgentFunction = (
  url: string,
  options?: { body?: Record<string, unknown>; query?: Record<string, unknown> | string; headers?: Record<string, string> },
  customs?: AgentCustoms
): Promise<Response> => {
  'use strict';

  const finalUrl =
    (customs?.apiRoot ?? 'https://www.clubhouseapi.com/api') + (url ?? '');

  const opts: Record<string, unknown> = options ?? {};
  const customOpts = customs ?? {};

  const headers: Record<string, string> = (opts.headers as Record<string, string>) ?? {};
  const deviceId = customOpts.deviceId ?? persistentDeviceId ?? uuidv4().toUpperCase();
  persistentDeviceId = persistentDeviceId ?? deviceId;

  headers['User-Agent'] =
    customOpts.userAgent ?? 'clubhouse/2029 (iPhone; iOS 16.3; Scale/3.00)';
  headers['CH-Languages'] = customOpts.languages ?? 'en-US';
  headers['CH-Locale'] = customOpts.locale ?? 'en_US';
  headers['CH-AppVersion'] = customOpts.appVersion ?? '23.02.07';
  headers['CH-AppBuild'] = customOpts.appBuild ?? '2029';
  headers['CH-DeviceId'] = deviceId;
  headers['CH-UserID'] = customOpts.userId ?? '(null)';

  if (customOpts.token) {
    headers.Authorization = 'Token ' + customOpts.token;
  }

  headers.Accept = customOpts.accept ?? 'application/json';
  headers['Accept-Encoding'] = customOpts.acceptEncodings ?? 'gzip, deflate, br';
  headers['Accept-Language'] = customOpts.acceptLanguages ?? 'en-US;q=1';
  headers.Connection = 'keep-alive';

  opts.headers = headers;

  const bodyData = opts.body;
  if (customOpts._preventBodySerialization) {
    delete opts.body;
  } else if (typeof bodyData === 'object' && bodyData !== null && (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'PATCH')) {
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json; charset=utf-8';
    opts.body = JSON.stringify(bodyData);
  }

  const nextUrl = buildUrl(finalUrl, opts.query as Record<string, unknown> | string | undefined);
  delete opts.query;

  const finalOpts: RequestInit = {
    ...opts,
    method: opts.method as string | undefined,
    headers: opts.headers as Record<string, string>,
    body: opts.body as BodyInit | null | undefined,
    ...(customOpts.fetchOptions ?? {}),
  };

  const requestFetcher = typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : fetch;

  return requestFetcher(nextUrl, finalOpts);
};

export default agent;
