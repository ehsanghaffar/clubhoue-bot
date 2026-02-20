"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const commander_1 = __importDefault(require("commander"));
const glob_1 = require("glob");
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
async function main() {
    for (const pattern of licensableFiles) {
        const files = await (0, glob_1.glob)(pattern);
        for (const file of files) {
            try {
                const content = await fs_1.promises.readFile(file, 'utf-8');
                if (fileSkipList.some((skipFile) => file.endsWith(skipFile))) {
                    console.log(`skipping ... ${file}`);
                }
                else if (!content.startsWith(licenseContent) && !content.startsWith(licenseContent.trim())) {
                    if (content.includes(licenseContent)) {
                        console.log(`License found, but not on top, skipping it ... ${file}`);
                    }
                    else {
                        console.log(`License inserted ... ${file}`);
                        await fs_1.promises.writeFile(file, licenseContent + content);
                    }
                }
            }
            catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }
    }
}
commander_1.default.version('0.0.1', '-v, --version').option('--verbose', 'Verbose').parse(process.argv);
main().catch((err) => {
    console.error('Error releasing', err);
    process.exit(1);
});
//# sourceMappingURL=lic.js.map