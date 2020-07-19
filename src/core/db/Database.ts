import { DataProp, DataItem } from '@/global'
import { isString, isArray } from '@/utils/verify'
import { deepClone } from '@/utils/util'
import * as PATH from 'path'
import * as FS from 'fs'

export type Tree = { [key: string]: Tree | string[] }
export type Db = {
  category: Tree,
  data: DataItem[]
}
export type CategoryInfo = {
  [key: string]: string
}

export default class Database {
  path: string // json数据所在路径
  _categoryKeys: string[]
  _db: Db
  _pKey: string

  constructor(workdir: string, configName: string, categoryKeys: string[], pKey: string) {
    this.path = PATH.resolve(workdir, configName.replace(/\.json$/g, '') + '.json')
    if (!categoryKeys.length) {
      throw new Error('Database.create: descKeys must have length')
    }
    FS.mkdirSync(workdir, { recursive: true })
    this._categoryKeys = categoryKeys
    this._pKey = pKey
    this._db = this._initDb()
  }

  get(pKeyValue: string): DataItem | null
  get(pKeyValue: string[]): DataItem[]
  get(pKeyValue: string | string[]): DataItem[] | DataItem | null {
    const data = this._db.data
    if (isArray(pKeyValue)) {
      let result: DataItem[] = []
      for (let i = 0; i < data.length; i++) {
        const dataItem = data[i]
        if ((<Array<DataProp>>pKeyValue).indexOf(dataItem[this._pKey]) > -1) {
          result.push(dataItem)
        }
      }
      return deepClone(result)
    }
    for (let i = 0; i < data.length; i++) {
      if (data[i][this._pKey] === pKeyValue) {
        return deepClone(data[i])
      }
    }
    return null
  }

  getByCategory(categoryInfo: CategoryInfo): DataItem[] | null {
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

  
  set(categoryInfo: CategoryInfo, item: DataItem): void {
    const clone = deepClone(this._db)
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
        if (i === this._categoryKeys.length -1) {
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
      this._writeDb()
    } catch (err) {
      // 备份
      this._db = clone
      this._writeDb()
      throw err
    }
  }
  
  remove(pKeyValue: string): boolean {
    const searchIndex = this._searchData(pKeyValue)
    const totalLevel = this._categoryKeys.length
    if (searchIndex === -1) {
      return false
    }
    let ctgRoot = this._db.category
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
      while(++i < nodeKeys.length) {
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
    // this._writeDb()
    return result
  }
  
  has(pKeyValue: string): boolean {
    return !!this.get(pKeyValue)
  }

  // 根据目录节点获取下面所有主键
  private _getPkeys(cgtRoot: Tree): string[] {
    let deduplicateMap: any = {}
    let nodes: (Tree | string[])[] = [cgtRoot]
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

  private _initDb(): Db {
    let tree: Db | null = null
    try {
      tree = <Db>JSON.parse(FS.readFileSync(this.path).toString())
    } catch (err) {
      tree = {
        category: {},
        data: []
      }
      this._writeDb(tree)
    }
    return tree
  }

  private _writeDb(db?: Db): void {
    FS.writeFileSync(this.path, Buffer.from(JSON.stringify(this._db || db)))
  }
}
