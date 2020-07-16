import * as PATH from 'path'
import * as FS from 'fs'

const CHUNK_SUFFIX = '.chunk'
const SUFFIX_REGEXP = new RegExp(CHUNK_SUFFIX + '$')
const CHUNK_FILE_REGEXP = new RegExp('(.+)' + CHUNK_SUFFIX + '_(\\d+)$')

export type chunkInfo = {
  resourceName: string,
  chunkIndex: number
}

export function getChunkName(resourceName: string) {
  return resourceName + CHUNK_SUFFIX
}

export function getChunkFileName(resourceName: string, chunkIndex: number) {
  return getChunkName(resourceName) + '_' + String(chunkIndex + 1)
}

export function parseChunkFileName(ChunkFileName: string): chunkInfo {
  const result = CHUNK_FILE_REGEXP.exec(ChunkFileName)
  if (!result) {
    throw new Error('parseChunkFileName: 解析失败')
  }
  return {
    resourceName: result[1],
    chunkIndex: parseInt(result[2]) - 1
  }
}

/**
 * @param {string} chunkDirPath 不支持相对路径
 */
export function merge(chunkDirPath: string): void {
  if (/^[\\/]/.test(chunkDirPath)) {
    throw new Error('chunkDirPath WRONG !!!')
  }
  let chunkIndex = 0
  let readPath = ''
  const { dir, name } = PATH.parse(chunkDirPath)
  const chunks = []
  while (FS.existsSync((readPath = PATH.resolve(chunkDirPath, getChunkFileName(name, chunkIndex++))))) {
    chunks.push(FS.readFileSync(readPath))
  }
  FS.writeFileSync(PATH.resolve(dir, name), Buffer.concat(chunks))
  FS.rmdirSync(chunkDirPath, { recursive: true })
}

export function mergeInDir(dirPath: string) {
  const nameGroups = FS.readdirSync(dirPath)
  nameGroups.forEach(name => {
    const targetDir = PATH.resolve(dirPath, name)
    if (FS.statSync(targetDir).isDirectory() && SUFFIX_REGEXP.test(name)) {
      merge(targetDir)
    }
  })
}
