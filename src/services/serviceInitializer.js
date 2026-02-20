/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const fs = require('fs');
const path = require('path');
const agent = require('../helper/agent');
const { clubService } = require('./clubApiService');

/**
 * Initialize the ClubApiService with agent and profile
 * Loads profile from profile.json and sets up the agent for API calls
 * @returns {void}
 * @throws {Error} If profile.json cannot be loaded
 */
function initializeService() {
  try {
    // Load profile from profile.json
    const profilePath = path.join(process.cwd(), 'profile.json');
    
    if (!fs.existsSync(profilePath)) {
      console.warn('⚠️  profile.json not found at', profilePath);
      console.warn('Service will operate without credentials. Login first.');
      return;
    }

    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    
    // Set up agent with profile credentials
    const agentFunction = (url, options, customs) => {
      // Merge profile data into customs for authentication
      const mergedCustoms = {
        ...profile,
        ...customs,
        token: profile.token || profile.tokens?.auth,
      };
      return agent(url, options, mergedCustoms);
    };

    // Initialize service with agent and profile
    clubService.setProfile(profile);
    clubService.setAgent(agentFunction);
    
    console.log('✓ ClubApiService initialized with profile:', {
      user: profile.user?.username || 'unknown',
      userId: profile.user?.user_id || 'unknown',
      verified: profile.verified || false,
    });
  } catch (error) {
    console.error('Failed to initialize ClubApiService:', error.message);
    throw error;
  }
}

module.exports = { initializeService };
