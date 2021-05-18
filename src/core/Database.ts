import { DataProp, DataItem } from '../global'
import { isArray, isString } from '../utils/verify'
// import { simpleDeepClone } from '../utils/util'
import * as pathLib from 'path'
import * as fsLib from 'fs'

export type Tree = { [key: string]: Tree | string[] }
export type DatabaseInfo = {
  category: Tree,
  data: DataItem[]
}
export type CategoryInfo = {
  [key: string]: string
}

function simpleDeepClone(o: any) {
  return JSON.parse(JSON.stringify(o))
}

export default class Database {
  private _categoryKeys: string[]
  private _db: DatabaseInfo
  private _pKey: string // 主键
  public path: string // json数据所在路径

  constructor(workdir: string, configName: string, categoryKeys: string[], pKey: string) {
    this.path = pathLib.resolve(workdir, configName.replace(/\.json$/g, '') + '.json')
    if (!isArray(categoryKeys) || !categoryKeys.length) {
      throw new Error('invalid categoryKeys!')
    }
    fsLib.mkdirSync(workdir, { recursive: true })
    this._categoryKeys = categoryKeys
    this._pKey = pKey
    this._db = this._initDb()
  }

  private _initDb(): DatabaseInfo {
    let tree: DatabaseInfo | null = null
    try {
      tree = <DatabaseInfo>JSON.parse(fsLib.readFileSync(this.path).toString())
    } catch (err) {
      tree = {
        category: {},
        data: []
      }
      this._writeDb(tree)
    }
    return tree
  }

  private _writeDb(db?: DatabaseInfo): void {
    fsLib.writeFileSync(this.path, Buffer.from(JSON.stringify(db || this._db)))
  }

  // 搜索data数组中的数据项返回坐标
  private _searchData(pKeyValue: string): number {
    const data = this._db.data
    for (let i = 0; i < data.length; i++) {
      if (data[i][this._pKey] === pKeyValue) {
        return i
      }
    }
    return -1
  }

  // 添加数据
  private _addData(item: DataItem): void {
    const pKeyValue = item[this._pKey]
    const searchIndex = this._searchData(<string>pKeyValue)
    // 更新data数组
    if (searchIndex > -1) {
      this._db.data[searchIndex] = item
    } else {
      this._db.data.push(item)
    }
  }

  // 根据目录节点获取下面所有主键
  private _getPkeys(cgtRoot: Tree): string[] {
    const deduplicateMap: any = {}
    const nodes: (Tree | string[])[] = [cgtRoot]
    let node: Tree | string[] | undefined
    while ((node = nodes.shift())) {
      if (isArray(node)) {
        node.forEach((pKey: string) => {
          deduplicateMap[pKey] || (deduplicateMap[pKey] = true)
        })
        continue
      }
      const nodeKeys = Object.keys(node)
      for (let i = 0; i < nodeKeys.length; i++) {
        nodes.push(node[nodeKeys[i]])
      }
    }
    return Object.keys(deduplicateMap)
  }

  public set(categoryInfo: CategoryInfo, item: DataItem): void {
    let readyToWrite = false
    const clone = simpleDeepClone(this._db)
    try {
      const pKeyValue = item[this._pKey]
      if (!isString(pKeyValue)) {
        throw new Error(`Database.set: The dataItem is missing the STRING pKey: ${this._pKey}: ${item[this._pKey]}`)
      }
      this.remove(pKeyValue)
      let ctgRoot = this._db.category
      for (let i = 0; i < this._categoryKeys.length; i++) {
        const categoryKey = this._categoryKeys[i]
        const value = categoryInfo[categoryKey]
        if (!isString(value)) {
          throw new Error(`Database.set: The categoryInfo is missing the key: ${categoryKey}`)
        }
        const nextRoot = ctgRoot[value]
        if (i === this._categoryKeys.length - 1) {
          if (nextRoot) {
            if (!isArray(nextRoot)) {
              ctgRoot[value] = []
            }
            const pKeys = <string[]>ctgRoot[value]
            pKeys.indexOf(pKeyValue) === -1 && pKeys.push(pKeyValue)
          } else {
            // 需要创建新的主键数组
            ctgRoot[value] = [pKeyValue]
          }
          this._addData(item)
          break
        }
        if (!nextRoot || isArray(nextRoot)) {
          ctgRoot[value] = {}
        }
        ctgRoot = <Tree>ctgRoot[value]
      }
      readyToWrite = true
      this._writeDb()
    } catch (err) {
      // 备份
      this._db = clone
      if (readyToWrite) {
        this._writeDb()
      }
      throw err
    }
  }

  public get(pKeyValue: string): DataItem | null
  public get(pKeyValue: string[]): DataItem[]
  public get(pKeyValue: string | string[]): DataItem[] | DataItem | null {
    const data = this._db.data
    if (isArray(pKeyValue)) {
      const result: DataItem[] = []
      for (let i = 0; i < data.length; i++) {
        const dataItem = data[i]
        if ((<Array<DataProp>>pKeyValue).indexOf(dataItem[this._pKey]) > -1) {
          result.push(dataItem)
        }
      }
      return simpleDeepClone(result)
    }
    for (let i = 0; i < data.length; i++) {
      if (data[i][this._pKey] === pKeyValue) {
        return simpleDeepClone(data[i])
      }
    }
    return null
  }

  public remove(pKeyValue: string): boolean {
    const searchIndex = this._searchData(pKeyValue)
    const totalLevel = this._categoryKeys.length
    if (searchIndex === -1) {
      return false
    }
    const ctgRoot = this._db.category
    this._db.data.splice(searchIndex, 1)
    const removeNode = (
      root: Tree,
      pKeyValue: string,
      preDeleteRoot: Tree,
      deleteKey: string | null,
      level: number = 1
    ): boolean => {
      let i = -1
      const nodeKeys = Object.keys(root)
      let removeStatus = false
      while (++i < nodeKeys.length) {
        const nextRoot = root[nodeKeys[i]]
        if (isArray(nextRoot)) {
          if (level < totalLevel) {
            // 不是最后一层但却是数组 数据不合法 应删除
            delete root[nodeKeys[i]]
            continue
          }
          const index = nextRoot.indexOf(pKeyValue)
          if (index === -1) {
            return false
          }
          nextRoot.splice(index, 1)
          if (!nextRoot.length) {
            delete preDeleteRoot[deleteKey || nodeKeys[i]]
          }
          return true
        }
        // nextRoot是对象 判断有多少个键
        let nextPreDelete = preDeleteRoot
        let nextDeleteKey = deleteKey
        const nextRootKeysLength = Object.keys(nextRoot).length
        if (nextRootKeysLength > 1) {
          nextPreDelete = nextRoot
          nextDeleteKey = null
        } else if (nextRootKeysLength === 1) {
          nextDeleteKey || (nextDeleteKey = nodeKeys[i])
        }
        removeStatus = removeStatus || removeNode(<Tree>nextRoot, pKeyValue, nextPreDelete, nextDeleteKey, level + 1)
        if (removeStatus) {
          return true // 已经找到并删除
        }
      }
      return false
    }
    const result = removeNode(ctgRoot, pKeyValue, ctgRoot, null, 1)
    this._writeDb()
    return result
  }

  public getByCategory(categoryInfo: CategoryInfo): DataItem[] | null {
    let ctgRoot = this._db.category
    for (let i = 0; i < this._categoryKeys.length; i++) {
      const value = categoryInfo[this._categoryKeys[i]]
      if (!isString(value)) {
        if (value) {
          // key非空且不是string
          throw new Error(`Database.get: categoryKey: ${this._categoryKeys[i]}对应的值必须为string`)
        }
        return this.get(this._getPkeys(ctgRoot))
      }
      const nextRoot = ctgRoot[value]
      if (isArray(nextRoot)) { return this.get(nextRoot) }
      ctgRoot = nextRoot
    }
    return this.get(this._getPkeys(ctgRoot))
  }

  public has(pKeyValue: string): boolean {
    return !!this.get(pKeyValue)
  }
}
