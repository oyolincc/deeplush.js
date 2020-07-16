import { DataItem, DataProp } from '@/global'
import { iterateObject } from '@/utils/util'
import { isString } from '@/utils/verify'
import * as cheerio from 'cheerio'

/**
 * 属性提取函数
 */
export type PropEtrFn = ($item: Cheerio, $: CheerioStatic, meta: object) => DataProp

export interface EtrRule {
  [prop: string]: PropEtrFn
}

export interface EtrOpt {
  [selector: string]: EtrRule
}

export default class Extractor {

  _$: CheerioStatic

  constructor(document: string | Buffer) {
    this._$ = cheerio.load(document)
  }

  /**
   * 提取数据
   * options: 提取配置
   * merge: 用于合并到提取后的数据的对象
   */
  extract(options: EtrOpt, merge?: DataItem): DataItem[] {
    const result: DataItem[] = []
    return (getInitItem => {
      iterateObject<EtrRule>(options, (selector, rule) => {
        const groups: Cheerio = this._$(selector)
        const meta = {}
        for (let i = 0; i < groups.length; i++) {
          const item: DataItem = getInitItem()
          iterateObject<PropEtrFn>(rule, (attr, fn) => {
            item[attr] = fn.call(this, this._$(groups[i]), this._$, meta)
          })
          result.push(item)
        }
      })
      return result
    })(merge ? () => ({ ...merge }) : () => ({}))
  }

  setContext(context: string | Buffer): void
  setContext(context: CheerioStatic): void
  setContext(context: string | Buffer | CheerioStatic): void {
    if (isString(context) || context instanceof Buffer) {
      this._$ = cheerio.load(context)
    } else {
      this._$ = context
    }
  }

  getDocument(): string {
    return this._$.html()
  }
}
