/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router, Request, Response, NextFunction } from 'express'
import { clubService } from '../services/club-api.service.js'
import { validateBody } from '../middlewares/validate.js'
import { searchUsersSchema } from '../validation/schemas.js'
import { createInternalError } from '../utils/errors.js'
import logger from '../utils/logger.js'

/**
 * User search routes
 */
const router: Router = Router()

/**
 * @openapi
 * /users/search_users:
 *   post:
 *     summary: Search for users on Clubhouse
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query string
 *     responses:
 *       200:
 *         description: Search results
 *       500:
 *         description: Server error
 */
router.post('/search_users', validateBody(searchUsersSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await clubService.searchUsers(req.body)
    res.send(users)
  } catch (error) {
    logger.error('Error searching users:', { error })
    next(createInternalError('Failed to search users'))
  }
})

export default router
