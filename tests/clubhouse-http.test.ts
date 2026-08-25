import { describe, expect, it } from 'vitest'
import { ClubhouseApiError } from '../src/platforms/clubhouse/errors.js'
import { assertClubhouseResponse } from '../src/platforms/clubhouse/http.js'

describe('Clubhouse HTTP errors', () => {
  it('preserves a safe JSON diagnostic for a rejected request', async () => {
    const response = new Response(JSON.stringify({ error_message: 'Channel chat is unavailable' }), { status: 400 })

    await expect(assertClubhouseResponse('sendChannelMessage', response)).rejects.toMatchObject<ClubhouseApiError>({
      status: 400,
      kind: 'request',
      message: 'Clubhouse sendChannelMessage failed (request, HTTP 400): Channel chat is unavailable'
    })
  })

  it('does not expose an arbitrary non-JSON upstream response', async () => {
    const response = new Response('<html>private upstream response</html>', { status: 400 })

    await expect(assertClubhouseResponse('sendChannelMessage', response)).rejects.toMatchObject({
      message: 'Clubhouse sendChannelMessage failed (request, HTTP 400)'
    })
  })
})
