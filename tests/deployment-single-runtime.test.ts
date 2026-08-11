/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 *
 * Deployment single-runtime regression guard (F-01).
 *
 * The MVP must run exactly ONE live BotManager runtime. The API process
 * (`src/server.ts`) owns it. This test guards the two invariants that prevent a
 * second live runtime:
 *
 *   1. The standalone worker entry (`src/worker.ts`) must NOT boot live bots
 *      (no `botManager.startAll`, no `worker.start`).
 *   2. The production compose must not launch a separate worker container and
 *      must not provision Redis (which nothing in the MVP uses).
 *
 * These are structural assertions on the deployment configuration, guarding
 * against regressions that would otherwise require a full container run to
 * catch.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const workerSource = readFileSync(path.join(repoRoot, 'src/worker.ts'), 'utf8')
const composeProd = readFileSync(path.join(repoRoot, 'docker-compose.prod.yml'), 'utf8')

describe('single BotManager runtime in the MVP deployment (F-01)', () => {
  it('worker entry does not start live bots', () => {
    expect(workerSource).not.toMatch(/startAll/)
    expect(workerSource).not.toMatch(/botManager\./)
    expect(workerSource).not.toMatch(/worker\.start\(\)/)
  })

  it('worker entry is explicitly marked as future infrastructure', () => {
    expect(workerSource).toMatch(/FUTURE INFRASTRUCTURE|future infrastructure/i)
  })

  it('production compose has exactly one app runtime (api) and no worker service', () => {
    // The api service is the single live runtime.
    expect(composeProd).toMatch(/services:/)
    expect(composeProd).toMatch(/\n\s{4}api:/)
    // No worker container, no worker entrypoint, no second runtime.
    expect(composeProd).not.toMatch(/\n\s{4}worker:/)
    expect(composeProd).not.toMatch(/dist\/worker\.js/)
  })

  it('production compose no longer provisions unused Redis', () => {
    expect(composeProd).not.toMatch(/\n\s{4}redis:/)
    expect(composeProd).not.toMatch(/REDIS_URL/)
  })
})
