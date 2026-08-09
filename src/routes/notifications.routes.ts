/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router } from 'express'
import * as notificationsController from '../controllers/notifications.controller.js'

/**
 * Notifications routes
 */
const router: Router = Router()

/**
 * @openapi
 * /notifications:
 *   post:
 *     summary: Get notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size:
 *                 type: number
 *                 default: 20
 *                 description: Number of notifications per page
 *               page:
 *                 type: number
 *                 default: 1
 *                 description: Page number
 *     responses:
 *       200:
 *         description: List of notifications
 *       500:
 *         description: Server error
 */
router.post('/', notificationsController.getNotifications)

/**
 * @openapi
 * /notifications/actionable:
 *   post:
 *     summary: Get actionable notifications for the authenticated user
 *     tags:
 *       - Notifications
 *     responses:
 *       200:
 *         description: List of actionable notifications
 *       500:
 *         description: Server error
 */
router.post('/actionable', notificationsController.getActionableNotifications)

export default router
