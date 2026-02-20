"use strict";
/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const cmdr = __importStar(require("commander"));
const replaceSection = __importStar(require("markdown-replace-section"));
const util_1 = require("./util");
const DEBUG = false;
const excludeDirs = ['node_modules', 'tmp'];
const sectionName = 'Lines of Code (auto-generated stats)';
/**
  * Note, the "Lines of Code" section cannot be at the end
  * https://github.com/renke/markdown-replace-section/issues/1
  */
async function main() {
    const loc = await (0, util_1.execute)(`loc . --exclude ${excludeDirs.join(' ')}`, !DEBUG);
    let readMe = fs.readFileSync('README.md', 'utf-8');
    readMe = replaceSection(readMe, sectionName, '```txt<br>' + loc + '```', false);
    fs.writeFileSync('README.md', readMe, 'utf-8');
}
cmdr.version('0.0.1', '-v, --version').parse(process.argv);
main().catch((err) => {
    console.error('Error updating Readme.md', err);
    process.exit(111);
});
//# sourceMappingURL=loc.js.map