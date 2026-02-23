/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import logger from './logger';

interface PingLoopInfo {
  timeoutId: NodeJS.Timeout;
  startedAt: number;
}

interface PingResponse {
  success?: boolean;
  should_leave?: boolean;
}

const activePingLoops = new Map<string, PingLoopInfo>();

const clubApiService = () => require('../services/club-api.service');

export const startPingLoop = (channel: string): void => {
  stopPingLoop(channel);

  const pingLoop = async (): Promise<void> => {
    try {
      const ping = (await clubApiService().activePing({ channel })) as PingResponse;

      if (!activePingLoops.has(channel)) {
        return;
      }

      if (ping.success) {
        const timeoutId = setTimeout(pingLoop, 180000);
        activePingLoops.set(channel, { timeoutId, startedAt: Date.now() });
      }

      if (ping.should_leave) {
        logger.info('should_leave signal received', { ping });
        await clubApiService().joinChannel({ channel, source: 'feed' });
        stopPingLoop(channel);
      }
    } catch (error) {
      logger.error('Ping loop error:', { error });
      stopPingLoop(channel);
    }
  };

  const timeoutId = setTimeout(pingLoop, 180000);
  activePingLoops.set(channel, { timeoutId, startedAt: Date.now() });
};

export const stopPingLoop = (channel: string): void => {
  const loop = activePingLoops.get(channel);
  if (loop) {
    clearTimeout(loop.timeoutId);
    activePingLoops.delete(channel);
  }
};

export const getActiveLoops = (): string[] => Array.from(activePingLoops.keys());

process.on('SIGTERM', () => {
  logger.info('Stopping all ping loops on SIGTERM');
  for (const channel of activePingLoops.keys()) {
    stopPingLoop(channel);
  }
});

process.on('SIGINT', () => {
  logger.info('Stopping all ping loops on SIGINT');
  for (const channel of activePingLoops.keys()) {
    stopPingLoop(channel);
  }
});
