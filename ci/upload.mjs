#!/usr/bin/env node
import ci from 'miniprogram-ci'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    appid: { type: 'string' },
    project: { type: 'string' },
    'private-key': { type: 'string' },
    version: { type: 'string' },
    desc: { type: 'string', default: '' },
    robot: { type: 'string', default: '1' }
  }
})

for (const key of ['appid', 'project', 'private-key', 'version']) {
  if (!values[key]) {
    console.error(`missing --${key}`)
    process.exit(1)
  }
}

const project = new ci.Project({
  appid: values.appid,
  type: 'miniProgram',
  projectPath: values.project,
  privateKeyPath: values['private-key'],
  ignores: ['node_modules/**/*', '.git/**/*']
})

const uploadResult = await ci.upload({
  project,
  version: values.version,
  desc: values.desc,
  robot: Number(values.robot),
  setting: {
    es6: true,
    minify: true,
    minifyWXSS: true
  },
  onProgressUpdate: console.log
})

console.log(JSON.stringify(uploadResult, null, 2))
