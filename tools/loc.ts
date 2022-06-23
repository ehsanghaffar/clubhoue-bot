/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */

import * as fs from 'fs'

import * as cmdr from 'commander'
import * as replaceSection from 'markdown-replace-section'

import { execute } from './util'

const DEBUG = false
const excludeDirs = ['node_modules', 'tmp']
const sectionName = 'Lines of Code (auto-generated stats)'

/**
  * Note, the "Lines of Code" section cannot be at the end
  * https://github.com/renke/markdown-replace-section/issues/1
  */
async function main () {
  const loc = await execute(`loc . --exclude ${excludeDirs.join(' ')}`, !DEBUG)
  let readMe = fs.readFileSync('README.md', 'utf-8')

  readMe = replaceSection(readMe, sectionName, '```txt<br>' + loc + '```', false)

  fs.writeFileSync('README.md', readMe, 'utf-8')
}

cmdr.version('0.0.1', '-v, --version').parse(process.argv)

main().catch((err) => {
  console.error('Error updating Readme.md', err)
  process.exit(111)
})
