import * as pathLib from 'path'
import * as fsLib from 'fs'
import { Downloadable, DownloadTask } from './Downloader'
import { RequestOptions, normalizeOptions } from '../createRequest'
// import { isNumber } from '@/utils/verify'
// import { pathRegex } from '@/utils/util'

const CHUNK_SUFFIX = '.chunk'
const SUFFIX_REGEXP = new RegExp(CHUNK_SUFFIX + '$')
const CHUNK_FILE_REGEXP = new RegExp('(.+)' + CHUNK_SUFFIX + '_(\\d+)$')

export type chunkInfo = {
  resourceName: string,
  chunkIndex: number
}

export function createNormalizeTask(task: Downloadable, requestOptions?: RequestOptions) {
  const theTask = {
    url: task.url,
    path: task.path // 写入文件的路径
  } as DownloadTask
  const { base } = pathLib.parse(pathLib.resolve(task.path))
  const isChunk = theTask.isChunk = !!task.isChunk
  if (isChunk) {
    const chunkInfo = parseChunkFileName(base)
    theTask.resourceName = chunkInfo.resourceName
    theTask.chunkIndex = chunkInfo.chunkIndex
  } else {
    theTask.resourceName = base
  }

  theTask.boundary = task.boundary || '0-'
  theTask.totalSize = task.totalSize || 0
  const reqOptions = requestOptions || task.requestOptions || {}
  theTask.requestOptions = normalizeOptions({
    ...reqOptions,
    url: theTask.url
  })
  return theTask
}

export function getChunkName(resourceName: string) {
  return resourceName + CHUNK_SUFFIX
}

export function getChunkFileName(resourceName: string, chunkIndex: number) {
  return getChunkName(resourceName) + '_' + String(chunkIndex + 1)
}

export function parseChunkFileName(chunkFileName: string): chunkInfo {
  const result = CHUNK_FILE_REGEXP.exec(chunkFileName)
  if (!result) {
    throw new Error('invalid chunkFileName!')
  }
  return {
    resourceName: result[1],
    chunkIndex: parseInt(result[2]) - 1
  }
}

export function merge(chunkDirPath: string, removeDir: boolean = false): void {
  if (!SUFFIX_REGEXP.test(chunkDirPath)) {
    throw new Error('chunkDirPath is wrong!')
  }
  let chunkIndex = 0
  let readPath = ''
  const { dir, name } = pathLib.parse(chunkDirPath)
  const chunks = []
  while (fsLib.existsSync((readPath = pathLib.resolve(chunkDirPath, getChunkFileName(name, chunkIndex++))))) {
    chunks.push(fsLib.readFileSync(readPath))
  }
  if (chunks.length) {
    fsLib.writeFileSync(pathLib.resolve(dir, name), Buffer.concat(chunks))
    /* 删除目录 危险操作 谨慎调试 */
    removeDir && fsLib.rmdirSync(chunkDirPath, { recursive: true })
  } else {
    throw new Error('no chunk file!')
  }
}

// 将目录下所有chunk目录合并处理
export function mergeInDir(dirPath: string) {
  const nameGroups = fsLib.readdirSync(dirPath)
  nameGroups.forEach(name => {
    const targetDir = pathLib.resolve(dirPath, name)
    if (fsLib.statSync(targetDir).isDirectory() && SUFFIX_REGEXP.test(name)) {
      merge(targetDir)
    }
  })
}

// export function transToNextChunk(task: DlExecuteTask): DlExecuteTask | null {
//   if (!task.isChunk) {
//     return task
//   }
//   if (!isNumber(task.chunkIndex)) {
//     throw new Error('transToNextChunk: lack chunkIndex!')
//   }
//   let start = parseInt(task.boundary.split('-')[0])
//   const totalSize = task.totalSize
//   const chunkSize = <number>task.chunkSize
//   if (totalSize <= start) {
//     return null
//   }
//   if (totalSize - chunkSize > start) {
//     start = start + chunkSize
//   } else {
//     task.chunkSize = totalSize - start
//     start = totalSize
//   }
//   const regexInfo = pathRegex(task.path)
//   if (!regexInfo) {
//     throw new Error('transToNextChunk: invalid path!')
//   }
//   task.chunkIndex++
//   task.boundary = `${start}-`
//   task.path = PATH.resolve(regexInfo[1], getChunkFileName(task.resourceName, task.chunkIndex))
//   return task
// }
