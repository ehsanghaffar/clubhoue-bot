import debug from 'debug';

const name = 'app-logger';

const createLogger = (domain?: string): debug.Debugger => {
  if (domain) {
    return debug(`${name}:${domain}`);
  }
  return debug(name);
};

export default createLogger;
