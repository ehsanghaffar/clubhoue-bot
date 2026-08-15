import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

require('dotenv').config();

export const projName = 'clubhouse-full-api';
export const projDir = path.resolve(__dirname, '../');
export const appsDir = path.resolve(path.join(projDir, 'src'));
export const routeDir = path.resolve(path.join(projDir, 'routes'));
export const projPkgJson = require(path.join(projDir, 'package.json'));

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function execute(script: string, _debug = false): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    childProcess.exec(script, { maxBuffer: 1024 * 1000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(error);
        rejectPromise(stderr);
      } else {
        resolvePromise(stdout);
      }
    });
  });
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

export async function getGlobFiles(globPattern: string): Promise<string[]> {
  try {
    const result = await glob(globPattern);
    return result;
  } catch (error) {
    console.log(error);
    return [];
  }
}
