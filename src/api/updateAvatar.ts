/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import FormData from 'form-data'
const { customAlphabet } = require('nanoid')

import agent from '../helper/agent'
import type { Profile } from '../types/config'

const random = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 16)

const updateAvatar = async (profile: Profile, buffer?: Buffer): Promise<unknown> => {
  'use strict'

  const form = new FormData()
  const boundary = 'Boundary+' + random()

  ;(form as unknown as Record<string, unknown>)._boundary = boundary
  form.append('file', buffer, {
    contentType: 'image/jpeg',
    filename: 'image.jpg'
  })

  const response = await agent(
    '/update_photo',
    {
      body: form as unknown as Record<string, unknown>
    },
    {
      ...profile,
      _preventBodySerialization: true
    }
  )
  const data = await response.json()

  return data
}

export default updateAvatar
