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
        console.log('should_leave', ping);
        await clubApiService().joinChannel({ channel, source: 'feed' });
        stopPingLoop(channel);
      }
    } catch (error) {
      console.error('Ping loop error:', error);
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
