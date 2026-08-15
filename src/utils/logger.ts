/**
 * @license
 * @copyright Ehsanghaffar.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
import winston from 'winston'
import fs from 'fs'
import path from 'path'

fs.mkdirSync(path.join(process.cwd(), 'logs'), { recursive: true })

const logger: winston.Logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'clubhouse-bot' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
})

export default logger

export const shutdownLogger = async (timeoutMs = 500): Promise<void> => {
  try {
    logger.info('Flushing and closing logger transports')
    for (const transport of logger.transports) {
      try {
        // Some transports expose a close method that will flush and close underlying resources
        if (typeof (transport as any).close === 'function') {
          (transport as any).close()
        }
      } catch (e) {
        // ignore individual transport errors
      }
    }
    // Give transports a short moment to flush writes to disk/console
    await new Promise(resolve => setTimeout(resolve, timeoutMs))
  } catch (e) {
    // swallow errors during shutdown logging
  }
}

