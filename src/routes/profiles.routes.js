/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const Joi = require("joi");
const auth = require("../middlewares/auth");
const TokenModel = require('../models/token')
const { constants } = require('../config');
const { createValidationError, createInternalError } = require('../utils/errors')
const clubService = require("../services/clubApiService");
require('dotenv').config();

const addProfileSchema = Joi.object({
  token: Joi.string().hex().length(40).required(),
  name: Joi.string().min(3).max(50).required()
});

const profileLoc = path.join(__dirname, "../../profile.json");
let ctx = false;
let ctx2;
let profile = {}; // Temporary profile object

if (fs.existsSync(profileLoc)) {
  ctx = JSON.parse(fs.readFileSync(profileLoc));
  profile.token = ctx.auth_token;
  profile.deviceId = ctx.deviceId;
}

/**
 * @swagger
 * /profiles/add_profile:
 *   post:
 *     summary: Add a new profile
 *     tags: [Profiles]
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
 *                 description: Authentication token (40 character hex)
 *                 example: "aa4e2c4f25f83e50bb5ca04168f97e5c4bcb9b9f"
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 50
 *                 description: Profile name
 *                 example: "John Doe"
 *     responses:
 *       200:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 token:
 *                   type: string
 *                 name:
 *                   type: string
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/add_profile', async (req, res, next) => {
  const { error, value } = addProfileSchema.validate(req.body);
  if (error) {
    return next(createValidationError(error.details[0].message));
  }

  try {
    const data = new TokenModel({
      token: value.token,
      name: value.name
    });
    const dataToSave = await data.save();
    res.status(constants.HTTP_STATUS.OK).json(dataToSave);
  } catch (error) {
    next(createInternalError('Failed to save profile'));
  }
});

/**
 * @swagger
 * /profiles/change-profile:
 *   post:
 *     summary: Change the current profile
 *     tags: [Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: New authentication token
 *                 example: "aa4e2c4f25f83e50bb5ca04168f97e5c4bcb9b9f"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       500:
 *         description: Internal server error
 */
router.post("/change-profile", async (req, res, next) => {
  const user = req.body;
  try {
    if (fs.existsSync(profileLoc)) {
      ctx = JSON.parse(fs.readFileSync(profileLoc));
      ctx.token = user?.token;
      ctx.tokens.auth = user?.token;
      ctx._debug.auth_token = user?.token;
      fs.writeFileSync(profileLoc, JSON.stringify(ctx));
    }
    res.send(ctx);
  } catch (err) {
    console.log(err);
    next(createInternalError("Failed to update profile"));
  }
});

const getUserToken = async (name) => {
  try {
    const user = await TokenModel.findOne({ name: name }).lean()
    return user
  } catch (error) {
    return `Error ${error}`
  }
}

/**
 * @swagger
 * /profiles/search_users:
 *   post:
 *     summary: Search for users (profiles)
 *     tags: [Profiles]
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
 *                 example: "john"
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

/**
 * @swagger
 * /profiles/accept_invite:
 *   post:
 *     summary: Accept an invitation to join a channel (using profile)
 *     tags: [Profiles]
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
 *                 description: Username of the profile to use
 *                 example: "John Doe"
 *               channel:
 *                 type: string
 *                 description: Channel ID to join
 *                 example: "channel123"
 *     responses:
 *       200:
 *         description: Invitation accepted successfully
 *       500:
 *         description: Internal server error
 */
router.post("/accept_invite", async (req, res) => {
  const userName = req.body.username;
  const channel = req.body.channel;
  try {
    const user = await getUserToken(userName)
    profile.token = user.token
    const result = await clubService.acceptSpeakerInvite({ channel: channel });
    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error...");
  }
});

/**
 * @swagger
 * /profiles/get_user:
 *   post:
 *     summary: Get user profile information
 *     tags: [Profiles]
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
 *                 description: User ID to retrieve
 *                 example: "12345"
 *     responses:
 *       200:
 *         description: User profile information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       500:
 *         description: Internal server error
 */
router.post('/get_user', async (req, res) => {
  const id = req.body.user_id
  try {
    const user = await clubService.getUser({ id: id })
    res.send(user)
  } catch (error) {
    console.error(error);
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error...");
  }
})

/**
 * @swagger
 * /profiles/all_users:
 *   get:
 *     summary: Get all stored user profiles
 *     tags: [Profiles]
 *     responses:
 *       200:
 *         description: List of all user profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   token:
 *                     type: string
 *                   name:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get('/all_users', async (req, res) => {
  try {
    const users = await TokenModel.find()
    res.send(users)
  } catch (error) {
    res.status(constants.HTTP_STATUS.INTERNAL_SERVER_ERROR).send(error)
  }
})

/**
 * @swagger
 * /profiles/get_token:
 *   get:
 *     summary: Get the current authentication token
 *     tags: [Profiles]
 *     responses:
 *       200:
 *         description: Current authentication token
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "aa4e2c4f25f83e50bb5ca04168f97e5c4bcb9b9f"
 *       500:
 *         description: Internal server error
 */
router.get('/get_token', async (req, res) => {
  ctx2 = JSON.parse(fs.readFileSync(profileLoc));
  res.send(ctx2.token)
})

module.exports = router;