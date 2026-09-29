import ci from 'miniprogram-ci'
import fs from 'node:fs'

const appid = 'wx38f1bdc8a75c53df'
const projectPath = '/data/mqlt/miniprogram/unpackage/dist/dev/mp-weixin'
const privateKeyPath = '/data/mqlt/ci/keys/private.wx38f1bdc8a75c53df.key'
const qrcodeOutputDest = '/data/mqlt/ci/logs/preview-1.0.1.jpg'

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath,
  privateKeyPath,
  ignores: ['node_modules/**/*', '.git/**/*'],
})

const result = await ci.preview({
  project,
  desc: '1.0.1 mall comments stars',
  robot: 1,
  setting: { es6: true, minify: true, minifyWXSS: true },
  qrcodeFormat: 'image',
  qrcodeOutputDest,
  onProgressUpdate: () => {},
})
fs.writeFileSync('/data/mqlt/ci/logs/preview-1.0.1.json', JSON.stringify(result, null, 2))
console.log('preview_qr', qrcodeOutputDest, fs.existsSync(qrcodeOutputDest) ? fs.statSync(qrcodeOutputDest).size : 0)
console.log('preview_result_keys', Object.keys(result || {}))
