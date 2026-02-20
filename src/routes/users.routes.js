/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();
const { constants } = require('../config');

// Temporary: avoid ESM import issues
const clubService = require("../services/clubApiService");

/**
 * @swagger
 * /users/search_users:
 *   post:
 *     summary: Search for users
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query for users
 *             example:
 *               query: "john"
 *     responses:
 *       200:
 *         description: List of users matching the search query
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Internal server error
 */
router.post("/search_users", async (req, res) => {
  const query = req.body;
  try {
    const users = await clubService.searchUsers(query);
    res.send(users);
  } catch (error) {
    console.error(error);
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error...");
  }
});

module.exports = router;