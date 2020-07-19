import Downloader, { DownloaderTask, DlExecuteTask } from '@/core/task/Downloader'
import Hooks, { HookError } from '@/core/assist/Hooks'
import Database from '@/core/db/Database'
import { ReqUnVerifyOpt } from '@/core/Request/Request'
import { downloaderOption, TT, resourceKey } from './config'
import { log, delay, parseTime, parseSize } from '@/utils/util'

export async function waitingDownload(
  d: Downloader,
  exceedWaiting: number,
  taskList: DownloaderTask[],
  reqOptions?: ReqUnVerifyOpt
) {
  if (d.isStop()) {
    d.start()
  }
  reqOptions && (taskList = taskList.map(task => ({...task, reqOptions})))
  for (let i = 0; i < taskList.length; i++) {
    const task = taskList[i]
    let downloadFlag = false
    while (!downloadFlag) {
      try {
        d.download(task)
        downloadFlag = true
      } catch (err) {
        log(err.message)
        log(`${parseTime(exceedWaiting)}后重试...`)
        await delay(exceedWaiting)
      }
    }
  }
}

function transToDlData(task: DlExecuteTask, taskType: string) {
  const result: DownloaderTask = task
  // result.reqOptions = {
  //   headers: task.reqOptions.headers
  // }
  delete result.reqOptions
  return {
    category: {
      taskType,
      page: String(task.page)
    },
    data: result
  }
}


export default function getDownloader(downloadDb: Database) {
  const downloadHooks = new Hooks<[DlExecuteTask, HookError]>()
  const downloader = new Downloader(downloaderOption, downloadHooks)
  
  downloadHooks.register(Downloader.hooks.ABORT, task => {
    console.log('有一个任务不符合规范，已被放弃')
    const { category, data } = transToDlData(task, TT.DOWNLOAD_ABORT)
    downloadDb.set(category, data)
  })
  
  downloadHooks.register(Downloader.hooks.START, task => {
    const processing = downloader.getProcessingCount()
    const waiting = downloader.getWaitingCount()
    let prefix = `准备下载：${task[resourceKey]}，大小${parseSize(task.totalSize)}`
    if (task.isChunk) {
      prefix += '；大小超出阈值，进行大文件分块下载'
    }
    log(prefix + `\n当前队列：${processing}/${waiting + processing}`)
    const { category, data } = transToDlData(task, TT.DOWNLOAD_ING)
    downloadDb.set(category, data)
  })
  
  downloadHooks.register(Downloader.hooks.WRITE, task => {
    const nextTask = Downloader.transToNextChunk(task)
    if (!nextTask) {
      return
    }
    log(`${task[resourceKey]}的第${task.chunkIndex!}个分块写入完毕`)
    const { category, data } = transToDlData(nextTask, TT.DOWNLOAD_ING)
    downloadDb.set(category, data)
  })
  
  downloadHooks.register(Downloader.hooks.END, task => {
    downloadDb.remove(task[resourceKey])
    const { category, data } = transToDlData(task, TT.DOWNLOAD_DONE)
    log(`${task[resourceKey]}下载完毕`)
    downloadDb.set(category, data)
  })
  
  downloadHooks.register(Downloader.hooks.ERROR, (task, errInfo) => {
    log('****************************************')
    log(`下载${task[resourceKey]}出现报错`)
    log('****************************************')
    const { category, data } = transToDlData(task, TT.DOWNLOAD_ERROR)
    const errorData: DownloaderTask = {
      ...data,
      event: errInfo.event
    }
    errInfo.err && (errorData.err = errInfo.err)
    downloadDb.set(category, errorData)
  })
  
  return downloader
}
