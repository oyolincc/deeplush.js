import * as pathLib from 'path'
import Downloader, { downloaderHooks } from '../src/core/task/Downloader'

const d = new Downloader({
  max: 5,
  doingMax: 1,
  interval: 5000
})
d.on(downloaderHooks.START, task => console.log('下载开始啦!', task))
d.on(downloaderHooks.ABORT, task => console.log('抛弃!'))
d.on(downloaderHooks.WRITE, task => console.log('写!'))
d.on(downloaderHooks.END, task => console.log('OK!'))
d.on(downloaderHooks.ERROR, reason => console.log('报错啦!'))
d.download({
  url: 'http://www.example.org/forum.php?mod=viewthread&tid=7907',
  path: pathLib.resolve(__dirname, '../temp/test-downloader')
})
d.start()
