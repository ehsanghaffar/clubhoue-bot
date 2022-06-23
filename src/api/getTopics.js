/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import agent from '../structures/agent'

const getTopics = async profile => {
  'use strict'

  const response = await agent(
    '/get_all_topics',
    {},
    profile
  )
  const data = await response.json()

  return data
}

export default getTopics

export const specification = {
  success: Boolean,
  topics: [
    {
      abbreviated_title: String, // Subjects
      id: Number,
      title: String,
      topics: [
        {
          abbreviated_title: String,
          id: Number,
          title: String
        }
      ]
    }
  ]
}
