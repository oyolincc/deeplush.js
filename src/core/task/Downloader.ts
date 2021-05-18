import { RequestOptions as RO } from 'http'
import * as pathLib from 'path'
import * as fsLib from 'fs'
import * as mime from 'mime'
import Tasker, { TaskerOptions, taskerHooks } from './Tasker'
import {
  RequestOptions,
  CallbackOptions,
  createHttpRequest,
  createHttpsRequest
} from '../createRequest'
import {
  getChunkName,
  getChunkFileName,
  createNormalizeTask,
  merge as downloaderMerge,
  mergeInDir
} from './DownloaderUtil'
import { merge, pathRegex } from '../../utils/util'
import { isFunction, isNumber } from '../../utils/verify'
import { NormalError } from '../Emitter'

export const downloaderHooks = {
  ABORT: 'DownloaderAbort',
  START: 'DownloaderStart',
  WRITE: 'DownloaderWrite',
  END: 'DownloaderEnd',
  ERROR: 'DownloaderError'
}

export interface DownloaderOptions extends TaskerOptions {
  filter?: null | ((
    contentSize: number,
    contentType: string,
    ext: string
  ) => boolean)
  maxChunkThreshold?: number // 最大分块阈值，超出则进行文件分块
}

// 可以被下载的任务
export interface Downloadable {
  url: string
  path: string
  boundary?: string
  requestOptions?: RequestOptions
  [other: string]: any
}

// 正在被执行的
export interface DownloadTask extends Downloadable {
  isChunk: boolean
  resourceName: string
  boundary: string
  totalSize: number
  requestOptions: RO
  chunkIndex?: number
  chunkSize?: number
}

const defaultOptions = {
  filter: null,
  maxChunkThreshold: 32 * 1024 * 1024 // 32MB分块
}

function getCallbackOptions(
  this: Downloader,
  task: DownloadTask,
  execEnd: Function
): CallbackOptions {
  const maxChunkThreshold = this._options.maxChunkThreshold!
  let boundStart = parseInt(task.boundary.split('-')[0]) // 任务开始的开始字节
  let isChunk = task.isChunk
  let length = 0
  let contentSize = 0 // 本次请求内容的大小
  let chunks: Buffer[] = []

  return {
    onResHeaders: (options, res, abort) => {
      const headers = res.headers
      const contentType = headers['content-type'] || ''
      const ext = mime.getExtension(contentType) || ''
      const filter = this._options.filter
      contentSize = parseInt(headers['content-length'] || '0')
      isChunk || (task.totalSize = contentSize)
      // 过滤器执行
      if (filter) {
        if (!filter(contentSize, contentType, ext)) {
          abort()
          this.notify(downloaderHooks.ABORT, task)
          return
        }
      }
      const pathInfo = pathLib.parse(task.path)
      if (!isChunk) {
        // 没有拓展名 自动补全
        if (!pathInfo.ext) {
          task.resourceName += `.${ext}`
          task.path += `.${ext}`
        }
        // 文件大小大于设定阈值
        if (contentSize > maxChunkThreshold) {
          const resourceName = task.resourceName
          // 是全新的任务且需要分块
          isChunk = task.isChunk = true
          task.chunkIndex = 0
          task.chunkSize = maxChunkThreshold
          pathInfo.dir = pathLib.resolve(pathInfo.dir, getChunkName(resourceName))
          task.path = pathLib.resolve(pathInfo.dir, getChunkFileName(resourceName, 0))
        }
      }
      this.notify(downloaderHooks.START, task)
      fsLib.mkdirSync(pathInfo.dir, { recursive: true })
    },
    // 写入文件时 文件夹路径取dir 文件名取base
    onResData: (options, res, chunk) => {
      chunks.push(chunk)
      length += chunk.length
      const dir = (pathRegex(task.path) || ['', ''])[1]
      while (length > maxChunkThreshold) {
        length = length - maxChunkThreshold
        const data = Buffer.concat(chunks)
        const dataSlice = data.slice(0, maxChunkThreshold)
        chunks = [data.slice(maxChunkThreshold)]
        if (!isNumber(task.chunkIndex)) {
          throw new Error(`task chunkIndex wrong! -- chunkIndex: ${task.chunkIndex}`)
        }
        task.path = pathLib.resolve(dir, getChunkFileName(task.resourceName, task.chunkIndex))
        // 超过阈值 大文件分块
        this._writeFile(task.path, dataSlice, task)
        boundStart += maxChunkThreshold
        task.boundary = `${boundStart}-`
        task.chunkIndex++
      }
    },
    onResEnd: () => {
      if (length) {
        // 还有数据仍未写完 或 未分块
        const dir = (pathRegex(task.path) || ['', ''])[1]
        let resourceName = task.resourceName
        if (isChunk) {
          task.chunkSize = length
          if (!isNumber(task.chunkIndex)) {
            throw new Error(`task chunkIndex wrong! -- chunkIndex: ${task.chunkIndex}`)
          }
          resourceName = getChunkFileName(task.resourceName, task.chunkIndex)
        }
        task.path = pathLib.resolve(dir, resourceName)
        this._writeFile(task.path, Buffer.concat(chunks), task)
        boundStart += length
        task.boundary = `${boundStart}-`
        isChunk && task.chunkIndex!++ // 不可能为undefined
      }
      // 少数情况没有content-length请求头
      if (boundStart !== task.totalSize) {
        task.totalSize = boundStart
      }
      execEnd()
    },
    onError: (options, err) => {
      this.notify(downloaderHooks.ERROR, {
        err,
        task: { ...task }
      })
    }
  }
}

function exec(this: Tasker<DownloadTask>, task: DownloadTask, end: Function) {
  const requestOptions = task.requestOptions
  if (requestOptions.headers) {
    requestOptions.headers.Range = `bytes=${task.boundary}`
  } else {
    requestOptions.headers = { Range: `bytes=${task.boundary}` }
  }

  function execEnd() {
    // 收尾工作，针对分块文件合并分块
    if (task.isChunk) {
      const regexPath = pathRegex(task.path)
      regexPath && Downloader.merge(regexPath[1])
    }
    end()
  }

  const cbOptions = getCallbackOptions.call(this as Downloader, task, execEnd)
  if (requestOptions.protocol === 'http:') {
    createHttpRequest(requestOptions, cbOptions)
  } else if (requestOptions.protocol === 'https:') {
    createHttpsRequest(requestOptions, cbOptions)
  } else {
    throw new Error('only support http or https')
  }
}

export default class Downloader extends Tasker<DownloadTask> {
  static merge: (chunkDirPath: string) => void
  static mergeInDir: (dirPath: string) => void
  // static transToNextChunk: (task: DownloadTask) => DownloadTask | null
  protected _options: DownloaderOptions

  constructor(options: DownloaderOptions) {
    super(options)
    const { filter, maxChunkThreshold } = options
    if (filter && !isFunction(filter)) {
      throw new Error('filter should be a function!')
    }
    if (maxChunkThreshold && (!isNumber(maxChunkThreshold) || maxChunkThreshold <= 0)) {
      throw new Error('invalid maxChunkThreshold!')
    }
    // @ts-ignore
    this._options = merge(this._options, defaultOptions, true)
    this.on(taskerHooks.END, task => this.notify(downloaderHooks.END, task))
  }

  protected _writeFile(path: string, buffer: Buffer, task: DownloadTask) {
    fsLib.writeFileSync(path, buffer)
    this.notify(downloaderHooks.WRITE, task)
  }

  public download(task: Downloadable, requestOptions?: RequestOptions) {
    const theTask = createNormalizeTask(task, requestOptions)
    super.todo(theTask)
  }

  public todo() {
    throw new Error('you can not use this method! please use download instead!')
  }

  public start() {
    super.start(exec)
  }

  public notify(eventName: string, arg: DownloadTask | NormalError) {
    if (this.has(eventName)) {
      this.emit(
        eventName,
        eventName === downloaderHooks.ERROR ? arg : { ...arg }
      )
    }
  }
}

Downloader.merge = downloaderMerge
Downloader.mergeInDir = mergeInDir
