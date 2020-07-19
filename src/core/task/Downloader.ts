import * as PATH from 'path'
import * as FS from 'fs'
import * as mime from 'mime'
import { pathRegex, defineFreeze } from '@/utils/util'
import { isNumber } from '@/utils/verify'
import { getChunkName, getChunkFileName, parseChunkFileName, merge, mergeInDir, transToNextChunk } from './util'
import Tasker, { TaskerMain, Task, TaskerOpt } from './Tasker'
import Request, { ReqVerifyOpt, ReqCallbackOpt, ReqUnVerifyOpt } from '@/core/Request/Request'
import Hooks, { HookError } from '@/core/assist/Hooks'
import HOOKS from './downloaderHooks'

/**
 * maxSize 默认最大256MB
 * extRegExp 拓展名限制
 * maxThreshold 分块阈值
 */
export interface DownloadOpt {
  maxSize: number,
  extRegExp: null | RegExp,
  maxThreshold: number
}

export interface DownloaderOpt extends TaskerMain {
  options?: DownloadOpt
}

export interface DownloaderTask extends Task<object> {
  url: string,
  path: string,
  boundary?: string,
  reqOptions?: ReqUnVerifyOpt,
  [other: string]: any
}

export interface DlExecuteTask extends DownloaderTask {
  boundary: string,
  isChunk: boolean,
  reqOptions: ReqVerifyOpt,
  resourceName: string,
  totalSize: number,
  chunkIndex?: number,
  chunkSize?: number
}

const defaultDownloadOptions: DownloadOpt = {
  maxSize: 256 * 1024 * 1024, // 默认最大256MB
  extRegExp: null, // 无类型限制
  maxThreshold: 32 * 1024 * 1024 // 32MB分块
}

export default class Downloader extends Tasker<DlExecuteTask> {
  static hooks: typeof HOOKS
  static merge: (chunkDirPath: string) => void
  static mergeInDir: (dirPath: string) => void
  static transToNextChunk: (task: DlExecuteTask) => DlExecuteTask | null
  protected _request: Request
  protected _downloadOpt: DownloadOpt
  private _hooks: Hooks<[DlExecuteTask, HookError]> | null

  constructor(options: DownloaderOpt, hooks?: Hooks<[DlExecuteTask, HookError]>) {
    const taskerOpt: TaskerOpt<DlExecuteTask> = { ...options, exec }
    const downloadOpt = taskerOpt.options || {}
    delete taskerOpt.options
    super(taskerOpt)

    this._request = new Request()
    this._hooks = hooks instanceof Hooks ? hooks : null
    // this._serialNo = 0
    this._downloadOpt = {
      ...defaultDownloadOptions,
      ...downloadOpt
    }
  }

  download(task: DownloaderTask, reqOptions?: any) {
    task = { ...task }
    let { base } = PATH.parse(PATH.resolve(task.path))
    const isChunk = task.isChunk = !!task.isChunk
    if (isChunk) {
      const chunkInfo = parseChunkFileName(base)
      task.resourceName = chunkInfo.resourceName
      task.chunkIndex = chunkInfo.chunkIndex
    } else {
      // base = base.replace(/[\\/?*|<>":]+/g, '-') // 文件名合法化
      // downloadTask.path = PATH.resolve(dir, base)
      task.resourceName = base
    }

    task.boundary = task.boundary || '0-'
    // reqOptions处理
    reqOptions = reqOptions || task.reqOptions || {}
    reqOptions.url = task.url
    task.reqOptions = Request.parseOptions(reqOptions)
    task.totalSize || (task.totalSize = 0) 

    this.todo(task as DlExecuteTask)
  }

  protected _notifyHooks(ev: string, taskInfo: DlExecuteTask, err: Error | null) {
    const _hooks = this._hooks
    if (!_hooks) {
      return
    }
  
    taskInfo = { ...taskInfo }
    try {
      _hooks.notify(ev, taskInfo, { err, event: ev })
    } catch (err) {
      switch (ev) {
        case HOOKS.ABORT:
          _hooks.notify(HOOKS.ERROR, taskInfo, { err, event: ev })
          break
        case HOOKS.ERROR:
          throw err
      }
    }
  }

  protected _writeFile(path: string, buffer: Buffer, task: DlExecuteTask, cb?: Function) {
    FS.writeFileSync(path, buffer)
    this._notifyHooks(HOOKS.WRITE, task, null)
    cb && cb()
  }

}

function exec(this: Downloader, task: DlExecuteTask, end: Function) {
  try {
    execTask.call(this, task, () => {
      if (task.isChunk) {
        const regexPath = pathRegex(task.path)
        regexPath && Downloader.merge(regexPath[1])
      }
      this._notifyHooks(HOOKS.END, task, null)
      end()
    })
  } catch (err) {
    this._notifyHooks(HOOKS.ERROR, task, err)
  }
}


function execTask(this: Downloader, task: DlExecuteTask, end: Function) {
  const { extRegExp, maxSize, maxThreshold } = this._downloadOpt
  const reqOptions = task.reqOptions
  reqOptions.headers.Range = `bytes=${task.boundary}`

  let boundStart = parseInt(task.boundary.split('-')[0]) // 任务开始的开始字节
  let isChunk = task.isChunk
  let length = 0
  let contentSize = 0 // 本次请求内容的大小
  let chunks: Buffer[] = []
  
  const cbOptions: ReqCallbackOpt = {
    onResHeaders: (headers, abort) => {
      contentSize = parseInt(headers['content-length'] || '0')
      isChunk || (task.totalSize = contentSize)
      // 类型过滤
      const extStr: string = mime.getExtension(headers['content-type'] || '') || ''
      if (extRegExp instanceof RegExp && !extRegExp.test(extStr)) {
        abort()
        this._notifyHooks(HOOKS.ABORT, task, null)
        return
      }
      // 超出大小限制
      if (contentSize > maxSize) {
        abort()
        this._notifyHooks(HOOKS.ABORT, task, null)
        return
      }

      const pathInfo = PATH.parse(task.path)
      if (!isChunk) {
        // 没有拓展名 自动补全
        if (!pathInfo.ext) {
          task.resourceName += `.${extStr}`
          task.path += `.${extStr}`
        }
        // 文件大小大于设定阈值
        if (contentSize > maxThreshold) {
          const resourceName = task.resourceName
          // 是全新的任务且需要分块
          isChunk = task.isChunk = true
          task.chunkIndex = 0
          task.chunkSize = maxThreshold
          pathInfo.dir = PATH.resolve(pathInfo.dir, getChunkName(resourceName))
          task.path = PATH.resolve(pathInfo.dir, getChunkFileName(resourceName, 0))
        }
      }

      this._notifyHooks(HOOKS.START, task, null)
      FS.mkdirSync(pathInfo.dir, { recursive: true })
    },
    // 写入文件时 文件夹路径取dir 文件名取base
    onResData: (chunk) => {
      chunks.push(chunk)
      length += chunk.length
      const dir = (pathRegex(task.path) || ['', ''])[1]
      while (length > maxThreshold) {
        length = length - maxThreshold
        const data = Buffer.concat(chunks)
        const dataSlice = data.slice(0, maxThreshold)
        chunks = [data.slice(maxThreshold)]
        if (!isNumber(task.chunkIndex)) {
          throw new Error(`Downloader.download: task chunkIndex wrong -- chunkIndex: ${task.chunkIndex}`)
        }
        task.path = PATH.resolve(dir, getChunkFileName(task.resourceName, task.chunkIndex))
        // 超过阈值 大文件分块
        this._writeFile(task.path, dataSlice, task)
        boundStart += maxThreshold
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
            throw new Error(`Downloader.download: task chunkIndex wrong -- chunkIndex: ${task.chunkIndex}`)
          }
          resourceName = getChunkFileName(task.resourceName, task.chunkIndex)
        }
        task.path = PATH.resolve(dir, resourceName)
        this._writeFile(task.path, Buffer.concat(chunks), task, end)
        boundStart += length
        task.boundary = `${boundStart}-`
        isChunk && (task.chunkIndex as number)++ // 不可能为undefined
        return
      }
      end()
    }
  }

  const reqPromise = reqOptions.protocol === 'https:' ? this._request.https(reqOptions, cbOptions) : this._request.http(reqOptions, cbOptions)
  reqPromise.catch(err => {
    this._notifyHooks(HOOKS.ERROR, task, err)
  })

}


defineFreeze(Downloader, 'hooks', HOOKS)
defineFreeze(Downloader, 'transToNextChunk', transToNextChunk)
defineFreeze(Downloader, 'merge', merge)
defineFreeze(Downloader, 'mergeInDir', mergeInDir)

