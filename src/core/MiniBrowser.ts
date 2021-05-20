import { CookieJar, CookieAccessInfo } from 'cookiejar'
import { isString, isURL } from '../utils/verify'
import {
  fetchContent,
  NormalizedOptions,
  RequestOptions,
  normalizeOptions
} from './createRequest'
import * as mime from 'mime'

interface BrowseInfo {
  path: string
  requestOptions: NormalizedOptions | null
}

interface BrowseContent {
  ext: string,
  buffer: Buffer
}

function simpleMerge(src: RequestOptions, options?: RequestOptions) {
  options = options || {}
  const headers = { ...src.headers, ...options.headers }
  return {
    ...src,
    ...options,
    headers
  }
}

class BrowserTab {
  private _: MiniBrowser // eslint-disable-line no-use-before-define
  private _base: RequestOptions
  private _info: BrowseInfo

  constructor(_: MiniBrowser, options: RequestOptions) {
    this._ = _
    this._base = Object.freeze({ ...options })
    this._info = {
      path: '',
      requestOptions: null
    }
  }

  public newTab() {
    const tab = new BrowserTab(this._, this._base)
    tab._info.path = this._info.path
    tab._info.requestOptions = this._info.requestOptions
    return tab
  }

  public async to(extraOptions?: RequestOptions): Promise<BrowseContent>
  public async to(href: string | URL, extraOptions?: RequestOptions): Promise<BrowseContent>
  public async to(a?: any, b?: any): Promise<BrowseContent> {
    let options: NormalizedOptions
    if (isString(a) || isURL(a)) {
      options = normalizeOptions({
        ...simpleMerge(this._base, b),
        url: a
      })
    } else {
      options = normalizeOptions(simpleMerge(this._base, a))
    }
    const { host, path } = options
    if (host) {
      // const cookiesStr = this._.getCookies(host, path || '').toValueString()
      // 屏蔽path
      const cookiesStr = this._.getCookies(host, '').toValueString()
      options.headers.Cookie = cookiesStr
    }
    // Referer处理
    if (this._info.path && !options.headers.Referer) {
      options.headers.Referer = this._info.path
    }
    const { response, buffer } = await fetchContent(options)
    const ext = mime.getExtension(response.headers['content-type'] || '') || ''
    // 更新请求信息
    this._info.path = options.path
    this._info.requestOptions = options
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
    const tab = new BrowserTab(this, options)
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
