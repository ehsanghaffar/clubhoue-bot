"use strict";
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
exports.getGlobFiles = exports.fileExists = exports.execute = exports.sleep = exports.projPkgJson = exports.routeDir = exports.appsDir = exports.projDir = exports.projName = void 0;
const childProcess = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
require('dotenv').config();
exports.projName = 'clubhouse-full-api';
exports.projDir = path.resolve(__dirname, '../');
exports.appsDir = path.resolve(path.join(exports.projDir, 'src'));
exports.routeDir = path.resolve(path.join(exports.projDir, 'routes'));
exports.projPkgJson = require(path.join(exports.projDir, 'package.json'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.sleep = sleep;
function execute(script, _debug = false) {
    return new Promise((resolvePromise, rejectPromise) => {
        childProcess.exec(script, { maxBuffer: 1024 * 1000 }, (error, stdout, stderr) => {
            if (error) {
                console.error(error);
                rejectPromise(stderr);
            }
            else {
                resolvePromise(stdout);
            }
        });
    });
}
exports.execute = execute;
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    }
    catch {
        return false;
    }
}
exports.fileExists = fileExists;
async function getGlobFiles(globPattern) {
    try {
        const result = await (0, glob_1.glob)(globPattern);
        return result;
    }
    catch (error) {
        console.log(error);
        return [];
    }
}
exports.getGlobFiles = getGlobFiles;
//# sourceMappingURL=util.js.map