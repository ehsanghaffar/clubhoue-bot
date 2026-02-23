/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import { Router, Request, Response } from 'express';
import { clubService } from '../services/club-api.service';
import { constants } from '../config';
import logger from '../utils/logger';

/**
 * User search routes
 */
const router = Router();

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
router.post('/search_users', async (req: Request, res: Response) => {
  const query = req.body;
  try {
    const users = await clubService.searchUsers(query);
    res.send(users);
  } catch (error) {
    logger.error('Error searching users:', { error });
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send('Error...');
  }
});

export default router;
