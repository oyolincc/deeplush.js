import * as pathLib from 'path'
import Downloader, { downloaderHooks, DownloadTask, DownloaderError } from '../src/core/task/Downloader'

const d = new Downloader({
  max: 5,
  doingMax: 1,
  interval: 5000,
  maxChunkThreshold: 5000
})
d.on(downloaderHooks.START, (task: DownloadTask) => console.log('下载开始啦!', task.totalSize))
d.on(downloaderHooks.ABORT, (task: DownloadTask) => console.log('抛弃!'))
d.on(downloaderHooks.WRITE, (task: DownloadTask) => console.log('写!'))
d.on(downloaderHooks.END, (task: DownloadTask) => console.log('OK!'))
d.on(downloaderHooks.ERROR, (reason: DownloaderError) => console.log('报错啦!'))
d.download({
  url: 'http://www.test.org/data/attachment/comiis_rollpic/000/00/67/89_150_150.jpg',
  path: pathLib.resolve(__dirname, '../temp/test-downloader')
})
d.start()
