import { DataProp, DataItem } from '@/global'
import { isString, isObject } from '@/utils/verify'
import * as PATH from 'path'
import * as FS from 'fs'

type Tree = { [key: string]: Tree | DataProp }

export default class Database {
  path: string // json数据所在路径
  _keyNames: string[]
  _tree: Tree

  constructor(keyNames: string[], workdir: string, configName: string) {
    this.path = PATH.resolve(workdir, configName.replace(/\.json$/g, '') + '.json')
    if (!keyNames.length) {
      throw new Error('Database.create: keyNames 必须有长度')
    }
    FS.mkdirSync(workdir, { recursive: true })
    this._keyNames = keyNames
    this._tree = this._initTree()
  }

  get(item?: DataItem): Tree | DataProp {
    if (!item) { return this._tree }

    let root: Tree = JSON.parse(JSON.stringify(this._tree)) // 深拷贝
    for (let i = 0; i < this._keyNames.length; i++) {
      const key = item[this._keyNames[i]]
      if (!isString(key)) {
        if (!key) { return root }
        // key非空且不是string
        throw new Error(`Database.get: keyName: ${this._keyNames[i]}对应的值必须为string`)
      }
      const nextRoot = root[key]
      if (!isObject(nextRoot)) { return nextRoot }
      root = nextRoot
    }
    return root
  }
  
  set(item: DataItem): void {
    item = { ...item }
    let root = this._tree
    for (let i = 0; i < this._keyNames.length; i++) {
      const keyName = this._keyNames[i]
      const key = item[keyName]
      if (!isString(key)) {
        throw new Error(`Database.set: The dataItem is missing the key: ${keyName}`)
      }
      if (i === this._keyNames.length - 1) {
        root[key] = item
        delete item[keyName]
        break
      }
      if (!root[key]) {
        root[key] = {}
      }
      delete item[keyName]
      root = <Tree>root[key] // 必定非null
    }
    this._writeTree()
  }
  
  remove(item: DataItem, exactly?: boolean): boolean {
    let root = this._tree
    let deleteKey: string | null = null
    let preDeleteRoot: Tree = root
    for (let i = 0; i < this._keyNames.length; i++) {
      const key = item[this._keyNames[i]]
      const keyStr = String(key)
      if (!key) {
        if (exactly || !deleteKey) {
          return false
        }
        delete preDeleteRoot[deleteKey]
        break
      }
      if (!root[keyStr]) { break } // 要删除的项目不存在
      const nextRoot = <Tree>root[keyStr]
      if (Object.keys(root).length > 1) {
        preDeleteRoot = root
        deleteKey = keyStr
      } else if (!deleteKey){
        deleteKey = keyStr
      }
      root = nextRoot
      if (i === this._keyNames.length - 1) {
        // 最后一个key
        delete preDeleteRoot[deleteKey || keyStr]
        break
      }
    }

    // console.log(JSON.stringify(this._tree, null, 2))
    this._writeTree()
    return true
  }
  
  has(item: DataItem, exactly?: boolean): boolean {
    let root = this._tree
    for (let i = 0; i < this._keyNames.length; i++) {
      const key = item[this._keyNames[i]]
      const keyStr = String(key)
      if (!key) { return !exactly && !!i }
      if (!root[keyStr]) { return false }
      root = <Tree>root[keyStr]
    }
    return true
  }

  _initTree() {
    let tree = null
    try {
      tree = JSON.parse(FS.readFileSync(this.path).toString())
    } catch (err) {
      tree = {}
      this._writeTree(tree)
    }
    return tree
  }

  _writeTree(tree?: Tree) {
    FS.writeFileSync(this.path, Buffer.from(JSON.stringify(this._tree || tree)))
  }
}

