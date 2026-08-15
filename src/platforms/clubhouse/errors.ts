/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

export type ClubhouseFailureKind =
  | 'authentication'
  | 'rate_limited'
  | 'transient'
  | 'not_found'
  | 'conflict'
  | 'request'
  | 'network'
  | 'timeout'

/**
 * Typed Clubhouse platform error. Never includes tokens or Authorization
 * headers in messages — only operation name and HTTP status.
 */
export class ClubhouseApiError extends Error {
  readonly operation: string
  readonly status?: number
  readonly retryable: boolean
  readonly authenticationFailure: boolean
  readonly rateLimited: boolean
  readonly kind: ClubhouseFailureKind

  constructor (params: {
    operation: string
    status?: number
    kind: ClubhouseFailureKind
    message?: string
  }) {
    const retryable = params.kind === 'rate_limited' ||
      params.kind === 'transient' ||
      params.kind === 'network' ||
      params.kind === 'timeout'
    const authenticationFailure = params.kind === 'authentication'
    const rateLimited = params.kind === 'rate_limited'
    const message = params.message ?? `Clubhouse ${params.operation} failed (${params.kind})`
    super(message)
    this.name = 'ClubhouseApiError'
    this.operation = params.operation
    this.status = params.status
    this.kind = params.kind
    this.retryable = retryable
    this.authenticationFailure = authenticationFailure
    this.rateLimited = rateLimited
  }
}

export const classifyHttpStatus = (status: number): ClubhouseFailureKind => {
  if (status === 401 || status === 403) {
    return 'authentication'
  }
  if (status === 404) {
    return 'not_found'
  }
  if (status === 409) {
    return 'conflict'
  }
  if (status === 429) {
    return 'rate_limited'
  }
  if (status >= 500 && status < 600) {
    return 'transient'
  }
  if (status === 408) {
    return 'timeout'
  }
  return 'request'
}

export const classifyNetworkError = (error: unknown): ClubhouseFailureKind => {
  if (error instanceof Error) {
    const name = error.name
    if (name === 'AbortError' || name === 'TimeoutError') {
      return 'timeout'
    }
    const message = error.message.toLowerCase()
    if (message.includes('timeout') || message.includes('econnreset') ||
      message.includes('socket') || message.includes('network')) {
      return 'network'
    }
  }
  return 'network'
}
