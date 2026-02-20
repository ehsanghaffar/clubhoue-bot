/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

// Map to track active ping loops per channel
const activePingLoops = new Map();

const startPingLoop = (channel) => {
  // Clear any existing loop for this channel
  stopPingLoop(channel);

  const pingLoop = async () => {
    try {
      const ping = await require('../services/clubApiService').activePing({ channel });

      if (!activePingLoops.has(channel)) {
        return; // Loop was stopped
      }

      if (ping.success) {
        // Schedule next ping
        const timeoutId = setTimeout(pingLoop, 180000); // 3 minutes
        activePingLoops.set(channel, { timeoutId, startedAt: Date.now() });
      }

      if (ping.should_leave) {
        console.log("should_leave", ping);
        await require('../services/clubApiService').joinChannel({ channel: channel, source: "feed" });
        stopPingLoop(channel);
      }
    } catch (error) {
      console.error('Ping loop error:', error);
      stopPingLoop(channel);
    }
  };

  // Start the first ping
  const timeoutId = setTimeout(pingLoop, 180000);
  activePingLoops.set(channel, { timeoutId, startedAt: Date.now() });
};

const stopPingLoop = (channel) => {
  const loop = activePingLoops.get(channel);
  if (loop) {
    clearTimeout(loop.timeoutId);
    activePingLoops.delete(channel);
  }
};

// Cleanup on process exit
process.on('SIGTERM', () => {
  console.log('Stopping all ping loops...');
  for (const channel of activePingLoops.keys()) {
    stopPingLoop(channel);
  }
});

process.on('SIGINT', () => {
  console.log('Stopping all ping loops...');
  for (const channel of activePingLoops.keys()) {
    stopPingLoop(channel);
  }
});

module.exports = {
  startPingLoop,
  stopPingLoop,
  getActiveLoops: () => Array.from(activePingLoops.keys())
};