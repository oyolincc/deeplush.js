import { CookieJar, CookieAccessInfo } from 'cookiejar'
import { DataItem, ReqMeta } from '@/global'
import Request, { ReqVerifyOpt, ReqUnknownOpt } from '@/core/request/Request'
import Extractor, { EtrOpt } from '@/core/assist/Extractor'
import Hooks from '@/core/assist/Hooks'
import { isObject, isString } from '@/utils/verify'
import { defineFreeze } from '@/utils/util'
import { IncomingMessage } from 'http'
import * as URL from 'url'
import * as mime from 'mime'
import HOOKS from './hooks'

// _base 基础请求对象 每次请求传入的配置都将与之合成最终请求对象
// _options 最近一次请求所用的请求对象
// _$ 当前页面文档的cheerio对象
export default class Browser {
  private _base: ReqVerifyOpt
  private _options: ReqVerifyOpt | null
  private _request: Request
  private _cookieStore: CookieJar
  private _extractor: Extractor
  private _hooks: Hooks<[string]> | null

  constructor(options: ReqUnknownOpt, hooks?: Hooks<[string]> | null) {
    this._base = Request.parseOptions(options)
    this._options = null
    this._request = new Request()
    this._cookieStore = new CookieJar()
    this._extractor = new Extractor('')
    this._hooks = hooks || null
  }
  /**
   * 返回基于当前host下的绝对url
   */
  resolve(url: string): string {
    if (!this._options) {
      return url
    }
    const host = this._options.host
    return host ? URL.resolve(`${this._options.protocol}//${host}`, url) : url
  }
  /**
   * 根据当前请求页面提取数据组
   */
  extract(extractOptions: EtrOpt, extra?: DataItem): DataItem[] {
    return this._extractor.extract(extractOptions, extra)
  }
  /**
   * 前往指定页面，并提取信息
   */
  async digData(reqMeta: ReqMeta, extractOptions: EtrOpt): Promise<ReqMeta[]> {
    await this.go(reqMeta.url)
    const merge: ReqMeta = { ...reqMeta }
    return <ReqMeta[]>this.extract(extractOptions, merge)
  }
  /**
   * 克隆自身，生成新的Browser
   */
  clone() {
    const browser = new Browser(null, this._hooks)
    const _options = this._options
    browser._base = { ...this._base }
    if (_options) {
      const domain = _options.host
      const path = _options.path
      browser._options = { ..._options }
      domain && browser._cookieStore.setCookies(
        this._cookieStore.getCookies(new CookieAccessInfo(domain, path)).toValueString()
      )
    } else {
      browser._options = null
    }
    browser._extractor.setContext(this._extractor.getDocument())
    return browser
  }

  cloneOptions(): ReqVerifyOpt | null {
    return this._options && { ...this._options }
  }
  /**
   * 前往指定页面，并返回Promise
   */
  go(options: ReqUnknownOpt) {
    // 相对路径url处理
    if (isString(options)) {
      options = this.resolve(options)
    } else if (isObject(options) && isString(options.url)) {
      options.url = this.resolve(options.url)
    }

    const destOpt: ReqVerifyOpt = {
      ...this._base,
      ...Request.parseOptions(options)
    }
    return this._go(this._request, destOpt)
  }

  private async _go(
    reqInstance: Request,
    destOpt: ReqVerifyOpt
  ): Promise<{ ext: string, buffer: Buffer }> {
    if (this._options) {
      const domain = <string>this._options.host
      const path = this._options.path
      const cookieStr = this._cookieStore.getCookies(new CookieAccessInfo(domain, path)).toValueString()
      destOpt.headers.Cookie = cookieStr
    }
  
    this._hooks && await this._hooks.notify(HOOKS.BEFORE_GO, URL.format(destOpt))
  
    if (!destOpt.host) {
      throw new Error('Browser.go: 请求参数缺少host字段')
    }

    const { response, buffer } = await (destOpt.protocol === 'https:' ? reqInstance.https(destOpt) : reqInstance.http(destOpt))
    const ext = mime.getExtension(response.headers['content-type'] || '') || ''
    this._options = destOpt
    this._extractor.setContext(ext === 'html' ? buffer.toString() : '')
    this._updateByResponse(response)
    return {
      ext,
      buffer
    }
  }

  // 请求完成 根据响应更新自身状态及cookies数据
  private _updateByResponse(res: IncomingMessage) {
    const headers = res.headers
    if (headers['set-cookie']) {
      this._cookieStore.setCookies(headers['set-cookie'])
    }
  }
}

defineFreeze(Browser, 'hooks', HOOKS)
