import { isObject, isString, isFunction } from '@/utils/verify'
import { defineFreeze, noob } from '@/utils/util'
import * as HTTP from 'http'
import { request as httpsRequest } from 'https'
import * as URL from 'url'
// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0 // Fiddle测试用

/**
 * 未知类型请求配置，通常由用户传入
 */
export type ReqUnknownOpt = ReqUnVerifyOpt | string | null
/**
 * 没有规范化的请求配置
 */
export interface ReqUnVerifyOpt {
  url?: string,
  host?: string,
  method?: string,
  protocol?: string,
  headers?: HTTP.OutgoingHttpHeaders
}
/**
 * 规范化的请求配置
 */
export interface ReqVerifyOpt {
  protocol?: string,
  path?: string,
  host?: string,
  method: string,
  headers: HTTP.OutgoingHttpHeaders
}
/**
 * 请求返回的结果
 */
export type ReqResult = {
  response: HTTP.IncomingMessage,
  buffer: Buffer
}
/**
 * 有关请求传入的回调类型
 */
export interface ReqCallbackOpt {
  onResHeaders?: (headers: HTTP.IncomingHttpHeaders, abort: () => void) => void
  onResData?: (chunk: Buffer) => void
  onResEnd?: (res: HTTP.IncomingMessage) => void
}

// 请求配置转换
function parseOptions(options?: ReqUnVerifyOpt): ReqVerifyOpt {
  let srcOptions: ReqUnVerifyOpt = <ReqUnVerifyOpt>(options ? Object.assign({}, isObject(options) ? options : URL.parse(options)) : {})

  // 如果有url字段 转换并附加到options
  if (isString(srcOptions.url)) {
    srcOptions = Object.assign(srcOptions, URL.parse(srcOptions.url))
    delete srcOptions.url
  }
  srcOptions.method = isString(srcOptions.method) ? srcOptions.method.toUpperCase() : 'GET'
  isObject(srcOptions.headers) || (srcOptions.headers = {})
  return <ReqVerifyOpt>srcOptions
}

function parseCbOptions(cbOptions: any): ReqCallbackOpt {
  if (cbOptions) {
    isFunction(cbOptions.onResHeaders) || (cbOptions.onResHeaders = noob)
    isFunction(cbOptions.onResData) || (cbOptions.onResData = noob)
    isFunction(cbOptions.onResEnd) || (cbOptions.onResEnd = noob)
  } else {
    cbOptions = {}
  }
  return cbOptions
}


export default class Request {
  static parseOptions: (options?: ReqUnknownOpt) => ReqVerifyOpt

  request(
    options: ReqUnknownOpt | undefined,
    cbOptions?: ReqCallbackOpt
  ): Promise<ReqResult> {
    const reqOptions: ReqVerifyOpt = Request.parseOptions(options)
    return reqOptions.protocol === 'https:' ? this.https(reqOptions, cbOptions) : this.http(reqOptions, cbOptions)
  }

  http(
    options: ReqVerifyOpt,
    cbOptions?: ReqCallbackOpt
  ): Promise<ReqResult> {
    cbOptions = parseCbOptions(cbOptions)
    return this._request(HTTP.request, options, cbOptions)
  }

  https(
    options: ReqVerifyOpt,
    cbOptions?: ReqCallbackOpt
  ): Promise<ReqResult> {
    cbOptions = parseCbOptions(cbOptions)
    return this._request(httpsRequest, options, cbOptions)
  }

  _request(
    method: typeof HTTP.request | typeof httpsRequest,
    options: ReqVerifyOpt,
    cbOptions: ReqCallbackOpt
  ): Promise<ReqResult> {
    const { onResHeaders, onResData, onResEnd } = cbOptions
    return new Promise<ReqResult>((resolve, reject) => {
      let doCallback = (fn: Function, ...args: any[]) => {
        try {
          return fn(...args)
        } catch (err) {
          reject(err)
        }
      }
      const req = method(options, res => {
        onResHeaders && doCallback(onResHeaders, res.headers, () => req.abort())
        // 倘若存在自定义data处理回调，则不返回buffer数据
        if (onResData) {
          res.on('data', chunk => doCallback(onResData, chunk))
          res.on('end', () => {
            onResEnd && doCallback(onResEnd, res)
            resolve({
              response: res,
              buffer: Buffer.alloc(0)
            })
          })
        } else {
          const chunks: Buffer[] = []
          res.on('data', chunk => chunks.push(chunk))
          res.on('end', () => {
            onResEnd && doCallback(onResEnd, res)
            resolve({
              response: res,
              buffer: Buffer.concat(chunks)
            })
          })
        }
      })
      req.on('error', err => reject(err))
      req.end()
    })
  }
}

defineFreeze(Request, 'parseOptions', parseOptions)
