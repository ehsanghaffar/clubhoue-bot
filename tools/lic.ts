import { promises as fsPromises } from 'fs';
import commander from 'commander';
import { glob } from 'glob';

const licenseContent = `/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
`;

const licensableFiles = ['./src/**/*.ts', './src/**/*.js'];
const fileSkipList = ['index.ts', 'test-setup.ts', 'mock.ts', 'polyfills.ts', 'main.ts'];

console.log('Applying license headers ...');

async function main(): Promise<void> {
  for (const pattern of licensableFiles) {
    const files = await glob(pattern);
    for (const file of files) {
      try {
        const content = await fsPromises.readFile(file, 'utf-8');

        if (fileSkipList.some((skipFile) => file.endsWith(skipFile))) {
          console.log(`skipping ... ${file}`);
        } else if (!content.startsWith(licenseContent) && !content.startsWith(licenseContent.trim())) {
          if (content.includes(licenseContent)) {
            console.log(`License found, but not on top, skipping it ... ${file}`);
          } else {
            console.log(`License inserted ... ${file}`);
            await fsPromises.writeFile(file, licenseContent + content);
          }
        }
      } catch (err) {
        console.error(`Error processing ${file}:`, err);
      }
    }
  }
}

commander.version('0.0.1', '-v, --version').option('--verbose', 'Verbose').parse(process.argv);

main().catch((err) => {
  console.error('Error releasing', err);
  process.exit(1);
});
