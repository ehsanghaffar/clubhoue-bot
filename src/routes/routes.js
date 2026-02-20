/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();

// Import route modules
const profilesRoutes = require('./profiles.routes');
const usersRoutes = require('./users.routes');
const channelsRoutes = require('./channels.routes');
const chatbotRoutes = require('./chatbot.routes');

// Mount route modules
router.use('/profiles', profilesRoutes);
router.use('/users', usersRoutes);
router.use('/channels', channelsRoutes);
router.use('/chatbot', chatbotRoutes);

// Legacy routes (to be migrated)
// These routes are kept for backward compatibility during transition

module.exports = router;
