import MiniBrowser from '../src/core/MiniBrowser'
import * as fs from 'fs'
import * as pathLib from 'path'

const browser = new MiniBrowser()
const tab = browser.newTab({})
tab.to('http://www.example.org/')
  .then(({ ext, buffer }) => {
    fs.writeFileSync(pathLib.resolve(__dirname, `../temp/net.${ext}`), buffer)
    console.log('DONE')
  })
  .catch(err => {
    console.log('报错啦\n', err)
  })
