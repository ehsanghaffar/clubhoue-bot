/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import { validateBody } from '../middlewares/validate.js'
import { searchUsersSchema } from '../validation/schemas.js'
import { searchUsers } from '../controllers/users.controller.js'

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
router.post('/search_users', validateBody(searchUsersSchema), searchUsers)

export default router
