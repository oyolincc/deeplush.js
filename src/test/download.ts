import Downloader, { DlExecuteTask } from '@/core/task/Downloader'
import Hooks, { HookError } from '@/core/assist/Hooks'
import { reqOptions } from './const'
import * as URL from 'url'
import { delay, log } from '@/utils/util'

const hooks = new Hooks<[DlExecuteTask, HookError]>()
const d = new Downloader({
  TQMax: 3,
  PTQMax: 1,
  interval: 5000,
  options: {
    maxSize: 512 * 1024 * 1024,
    extRegExp: null,
    maxThreshold: 100 * 1024
  }
}, hooks)

hooks.register(Downloader.hooks.END, downloadTask => {
  log(`${downloadTask}任务结束`)
})
hooks.register(Downloader.hooks.ABORT, downloadTask => {
  log('放弃请求', downloadTask)
})
hooks.register(Downloader.hooks.ERROR, (downloadTask, err) => {
  log('报错项目：', downloadTask)
  log('报错：', err)
})
hooks.register(Downloader.hooks.START, (downloadTask, err) => {
  log('')
})
hooks.register(Downloader.hooks.WRITE, (downloadTask, err) => {
  log('')
})

d.download({
  // url: 'http://hotstream.asia/2020/6/6/ka20051404-2.mp4',
  url: 'https://images.unsplash.com/photo-1592525239384-f00511efe30d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1405&q=80',
  path: 'F:/PROJECT/MYUTILS/tools/links-spider-dev/temp/ka20051404-2'
}, {
  ...reqOptions
})

d.start()
