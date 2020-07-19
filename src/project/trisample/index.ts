import * as PATH from 'path'
import Browse, { BrowseConfig } from '@/core/Browse'
import Browser from '@/core/browser/Browser'
import { DownloaderTask } from '@/core/task/Downloader'
import Database from '@/core/db/Database'
import { DataItem } from '@/global'
import { log, delay } from '@/utils/util'
import { reqOptions, extractOptions, root, target, TT, resourceKey } from './config'
import getDownloader, { waitingDownload } from './getDownloader'

const categoryKeys = ['taskType', 'page']
const browseDb = new Database(root, 'browse', categoryKeys, resourceKey)
const downloadDb = new Database(root, 'download', categoryKeys, resourceKey)

const downloader = getDownloader(downloadDb)
const browseConfig: BrowseConfig = {
  logOver: true,
  extractOptions,
  filter: (reqMeta, levelMetaArr) => {
    const level = levelMetaArr.length
    if (level === 1) {
      console.log(`准备前往${reqMeta.url}`)
    } else {
      const total = levelMetaArr[0].digData ? levelMetaArr[0].digData.length : 0
      console.log(`准备爬取第${level - 1}层的第${levelMetaArr[1].index + 1}/${total}入口数据`)
    }

    if (level !== 2) {
      return true
    }
    const resourceId = reqMeta[resourceKey]
    if (!resourceId) {
      console.log('缺少资源特征id，准备跳过')
      return false
    }
    const isDuplicate = browseDb.has(String(resourceId))
    if (isDuplicate) {
      console.log('发现一个重复的入口，准备跳过')
    }
    return !isDuplicate
  },
  onData: async (digData) => {
    if (!digData) {
      throw new Error('没有取到digData数据...')
    }
    const taskList: DownloaderTask[] = digData.map(data => ({
      ...data,
      reqOptions, // 请求配置
      path: PATH.resolve(root, 'dist', String(data.title || Date.now()))
    }))
    await waitingDownload(downloader, 2 * 60 * 1000, taskList)
  },
  onError: (reqMeta, errInfo) => {
    log('********************************************')
    log('！！！！！！！！！挖掘出现错误！！！！！！！！！')
    log('********************************************')
    const category = {
      taskType: TT.BROWSE_ERROR,
      page: String(reqMeta.page)
    }
    const dataItem: DataItem = {
      ...reqMeta,
      event: errInfo.event,
    }
    errInfo.err && (dataItem.err = errInfo.err.toString())
    try {
      browseDb.set(category, dataItem)
    } catch (err) {
      log('******************************************')
      log(errInfo.err)
      log(err)
      log('******************************************')
    }
  }
}


const browse = new Browse(browseConfig)
const browser = new Browser(reqOptions)

let taskList = <DownloaderTask[]>(downloadDb.getByCategory({ taskType: TT.DOWNLOAD_ING }) || [])
taskList = taskList.map(task => ({ ...task, reqOptions }))

async function todo() {
  await waitingDownload(downloader, 2 * 60 * 1000, taskList)
  while (downloader.getProcessingCount() || downloader.getWaitingCount()) {
    await delay(5000)
  }
  await browse.start(browser, {
    url: target,
    page: 1
  })
}

todo()
