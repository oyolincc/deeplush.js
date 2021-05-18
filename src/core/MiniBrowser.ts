import { CookieJar, CookieAccessInfo } from 'cookiejar'
import { fetchContent } from './createRequest'
import { RequestOptions } from 'http'
import * as mime from 'mime'

class BrowserTab {
  private _: MiniBrowser // eslint-disable-line no-use-before-define
  private _options: RequestOptions

  constructor(_: MiniBrowser, options: RequestOptions) {
    this._ = _
    this._options = options
  }

  public newTab() {
    return new BrowserTab(this._, this._options)
  }

  public async to(href: string) {
    const { host, path } = this._options
    if (host) {
      const cookiesStr = this._.getCookies(host, path || '').toValueString()
      const headers = this._options.headers || {}
      headers.Cookie = cookiesStr
      this._options.headers = headers
    }
    const { response, buffer, options } = await fetchContent(href, this._options)
    this._options = options
    const ext = mime.getExtension(response.headers['content-type'] || '') || ''
    // 更新cookies
    const cookies = response.headers['set-cookie']
    cookies && this._.setCookies(cookies)
    return {
      ext,
      buffer
    }
  }
}

export default class MiniBrowser {
  private _cookieStore: CookieJar
  private _tabs: BrowserTab[]

  constructor() {
    this._cookieStore = new CookieJar()
    this._tabs = []
  }

  public newTab(options: RequestOptions) {
    const tab = new BrowserTab(this, { ...options })
    this._tabs.push(tab)
    return tab
  }

  public getCookies(domain: string, path?: string) {
    return this._cookieStore.getCookies(new CookieAccessInfo(domain, path))
  }

  public setCookies(cookies: string | string[]) {
    this._cookieStore.setCookies(cookies)
  }
}
