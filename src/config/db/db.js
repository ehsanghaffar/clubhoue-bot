/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const mongoose = require('mongoose')
require("dotenv").config(); 

mongoose.set('strictQuery', true);

/**
 * Normalize MongoDB connection URL
 * Converts localhost to 127.0.0.1 to avoid IPv6 issues with Docker
 * @param {string} url - MongoDB connection URL
 * @returns {string} Normalized URL
 */
function normalizeMongoURL(url) {
  if (!url) {
    return 'mongodb://127.0.0.1:27017/clubhouse';
  }
  // Replace localhost with 127.0.0.1 to force IPv4
  return url.replace('mongodb://localhost', 'mongodb://127.0.0.1');
}

module.exports = async () => {
  try {
    const mongoURL = normalizeMongoURL(process.env.MONGODB_URL);
    console.log('Connecting to MongoDB:', mongoURL.replace(/\/\/.*@/, '//***@'));
    
    const connectionParams = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      family: 4, // Force IPv4
    };
    
    await mongoose.connect(mongoURL, connectionParams);
    console.log("✓ Connected to Database successfully");
  } catch (err) {
    console.error("✗ Database connection failed:", err.message);
    console.error("  Connection URL:", normalizeMongoURL(process.env.MONGODB_URL));
    console.error("  Make sure MongoDB is running on 127.0.0.1:27017");
    process.exit(1);
  }
}