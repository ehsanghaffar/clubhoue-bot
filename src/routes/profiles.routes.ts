/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import {
  addProfile,
  changeProfile,
  searchUsers,
  acceptInvite,
  getUser,
  getAllUsers,
  getToken
} from '../controllers/profile.controller.js'
import { validateBody } from '../middlewares/validate.js'
import {
  changeProfileSchema,
  searchUsersSchema,
  acceptInviteSchema,
  getUserSchema
} from '../validation/schemas.js'

/**
 * Profile management routes
 */
const router: Router = Router()

/**
 * @openapi
 * /profiles/add_profile:
 *   post:
 *     summary: Add a new profile/token
 *     tags:
 *       - Profiles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - name
 *             properties:
 *               token:
 *                 type: string
 *                 description: Authentication token (40 hex chars)
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *     responses:
 *       200:
 *         description: Profile saved
 *       400:
 *         description: Validation error
 */
router.post('/add_profile', addProfile)

/**
 * @openapi
 * /profiles/change-profile:
 *   post:
 *     summary: Change active profile token
 *     tags:
 *       - Profiles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       404:
 *         description: Profile not found
 */
router.post('/change-profile', validateBody(changeProfileSchema), changeProfile)

/**
 * @openapi
 * /profiles/search_users:
 *   post:
 *     summary: Search for users
 *     tags:
 *       - Profiles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/search_users', validateBody(searchUsersSchema), searchUsers)

/**
 * @openapi
 * /profiles/accept_invite:
 *   post:
 *     summary: Accept speaker invite for a user
 *     tags:
 *       - Profiles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - channel
 *             properties:
 *               username:
 *                 type: string
 *               channel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invite accepted
 */
router.post('/accept_invite', validateBody(acceptInviteSchema), acceptInvite)

/**
 * @openapi
 * /profiles/get_user:
 *   post:
 *     summary: Get user by ID
 *     tags:
 *       - Profiles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: User information
 */
router.post('/get_user', validateBody(getUserSchema), getUser)

/**
 * @openapi
 * /profiles/all_users:
 *   get:
 *     summary: Get all stored users
 *     tags:
 *       - Profiles
 *     responses:
 *       200:
 *         description: List of all users
 */
router.get('/all_users', getAllUsers)

/**
 * @openapi
 * /profiles/get_token:
 *   get:
 *     summary: Get current profile token
 *     tags:
 *       - Profiles
 *     responses:
 *       200:
 *         description: Current token
 *       404:
 *         description: Profile not found
 */
router.get('/get_token', getToken)

export default router
