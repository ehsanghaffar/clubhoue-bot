/* eslint-disable no-new */

import { readFile, writeFile } from 'fs'

import * as cmdr from 'commander'
import { Glob } from 'glob'

const licenseContent = `/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
`

const licensableFiles = ['./src/**/*.ts', './src/**/*.js', './routes/**/*.js']
const fileSkipList = [
  'index.ts',
  'test-setup.ts',
  'mock.ts',
  'polyfills.ts',
  'main.ts'
]

console.log('Applying license headers ...')

async function main () {
  licensableFiles.forEach((pattern) => {
    new Glob(pattern, (err, files) => {
      if (err) {
        throw err
      }
      files.forEach((file) => {
        readFile(file, 'utf-8', (err, content) => {
          if (err) {
            throw err
          }

          if (cmdr.verbose) {
            console.log(`processing ... ${file}`)
          }

          if (fileSkipList.some((skipFile) => file.endsWith(skipFile))) {
            if (cmdr.verbose) {
              console.log(`skipping ... ${file}`)
            }
          } else if (
            !content.startsWith(licenseContent) &&
            !content.startsWith(licenseContent.trim())
          ) {
            if (content.includes(licenseContent)) {
              console.log(`License found, but not on top, skipping it ... ${file}`)
            } else {
              console.log(`License inserted ... ${file}`)
              writeFile(file, licenseContent + content, (err) => {
                if (err) {
                  throw err
                }
              })
            }
          }
        })
      })
    })
  })
}

cmdr.version('0.0.1', '-v, --version').option('--verbose', 'Verbose').parse(process.argv)

main().catch((err) => {
  console.error('Error releasing', err)
  process.exit(1)
})
