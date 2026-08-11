/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import fs from 'fs'
import path from 'path'
import { clubService } from '../platforms/clubhouse/index.js'
import type { AgentFunction } from '../platforms/clubhouse/types.js'
import type { Profile } from '../types/config.js'
import agent from '../platforms/clubhouse/agent.js'
import logger from '../utils/logger.js'

/**
 * Initializes the legacy global `clubService` singleton from `profile.json`.
 *
 * LEGACY-ONLY: this runs exactly once during process bootstrap (before the HTTP
 * server starts serving) and is the ONLY place that mutates `clubService`
 * state. Request handlers never call `setProfile`/`setAgent`, so concurrent
 * legacy requests cannot observe each other's mutations. The modern `/v1` API
 * does not use `clubService` — it builds per-credential adapters.
 */
export function initializeService (): void {
  try {
    const profilePath = path.join(process.cwd(), 'profile.json')

    if (!fs.existsSync(profilePath)) {
      logger.warn('profile.json not found at', { path: profilePath })
      logger.warn('Service will operate without credentials. Login first.')
      return
    }

    const profile: Profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'))

    const agentFunction: AgentFunction = async (url, options, customs) => {
      const mergedCustoms = {
        ...profile,
        ...customs,
        token: profile.token ?? (profile as unknown as { tokens?: { auth?: string } }).tokens?.auth
      }

      return await agent(url, options, mergedCustoms)
    }

    clubService.setProfile(profile)
    clubService.setAgent(agentFunction)

    logger.info('ClubApiService initialized with profile:', {
      user: profile.user?.username ?? 'unknown',
      userId: profile.user?.user_id ?? 'unknown',
      verified: profile.verified ?? false
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Failed to initialize ClubApiService:', { error: message })
    throw error
  }
}
