import { isString, isURL, isObject } from '../utils/verify'
import {
  request as httpRequest,
  IncomingMessage,
  RequestOptions as RO,
  ClientRequest,
  OutgoingHttpHeaders
} from 'http'
import { request as httpsRequest } from 'https'

export interface NormalizedOptions extends RO {
  path: string
  protocol: string
  method: string
  headers: OutgoingHttpHeaders
  host?: string
  data?: any // 作为请求体
}

export interface RequestOptions extends RO {
  url?: string | URL
  base?: string | URL
  data?: any
}

export interface CallbackOptions {
  onResHeaders?: (options: NormalizedOptions, res: IncomingMessage, abort: () => void) => any
  onResData?: (options: NormalizedOptions, res: IncomingMessage, chunk: Buffer, abort: () => void) => any
  onResEnd?: (options: NormalizedOptions, res: IncomingMessage) => any
  onReqClose?: (options: NormalizedOptions, req: ClientRequest) => any,
  onError?: (options: NormalizedOptions, err: Error) => any
}

export interface RequestContent {
  options: NormalizedOptions
  response: IncomingMessage
  buffer: Buffer
}

export interface Normalizable<Result> {
  (options: RequestOptions): Result
  (url: string | URL, options?: RequestOptions | null): Result
  (url: string, base: string | URL, options?: RequestOptions | null): Result
}

// 获取请求的内容
export const fetchContent: Normalizable<Promise<RequestContent>> = function(...args: any[]) {
  const chunks: Buffer[] = []
  const callbackOpts: CallbackOptions = {
    onResData: (options, res, chunk) => chunks.push(chunk)
  }
  const prom = new Promise<RequestContent>((resolve, reject) => {
    callbackOpts.onResEnd = (options, res) => {
      resolve({
        options,
        response: res,
        buffer: Buffer.concat(chunks)
      })
    }
    callbackOpts.onError = (options, err) => reject(err)
    const params = args.concat(callbackOpts)
    createRequest.apply(null, params as Parameters<typeof createRequest>)
  })
  return prom
}

export function createRequest(options: RequestOptions, callbackOpts: CallbackOptions): ClientRequest
export function createRequest(url: string | URL, callbackOpts: CallbackOptions): ClientRequest
export function createRequest(
  url: string,
  base: string | URL,
  callbackOpts: CallbackOptions
): ClientRequest
export function createRequest(
  url: string | URL,
  options: RequestOptions | null,
  callbackOpts: CallbackOptions
): ClientRequest
export function createRequest(
  url: string,
  base: string | URL,
  options: RequestOptions | null,
  callbackOpts: CallbackOptions
): ClientRequest
export function createRequest(a: any, b: any, c?: any, d?: any) {
  const l = arguments.length - 1
  const callbackOpts = arguments[l]
  let options: NormalizedOptions

  if (l === 1) {
    if (isObject(a)) {
      options = normalizeOptions(a)
    } else {
      options = normalizeOptions({ url: a })
    }
  } else if (l === 2) {
    if (isString(b) || isURL(b)) {
      if (!isString(a)) {
        throw new Error('invalid url with base!')
      }
      options = normalizeOptions({ url: a, base: b })
    } else {
      options = normalizeOptions({ ...b, url: a })
    }
  } else {
    if (!isString(a)) {
      throw new Error('invalid url with base!')
    }
    options = normalizeOptions({ ...c, url: a, base: b })
  }

  return request(options, callbackOpts)
}

export function request(
  options: NormalizedOptions,
  callbackOpts: CallbackOptions
) {
  let method
  if (options.protocol === 'http:') {
    method = httpRequest
  } else if (options.protocol === 'https:') {
    method = httpsRequest
  } else {
    throw new Error('only support http or https')
  }
  const { onResHeaders, onResData, onResEnd, onReqClose, onError } = callbackOpts
  const deal = (err: Error) => {
    if (onError) {
      onError(options, err)
    } else {
      throw err
    }
  }
  const todo = (fn?: Function, ...args: any[]) => {
    try {
      fn && fn(options, ...args)
    } catch (err) {
      deal(err)
    }
  }
  const data = options.data || null
  delete options.data
  const req = method(options, res => {
    const abort = () => req.abort()
    todo(onResHeaders, res, abort)
    // 倘若存在自定义data处理回调，则不返回buffer数据
    if (onResData) {
      // 若没有注册data则end也不会被触发
      res.on('data', chunk => todo(onResData, res, chunk, abort))
      res.on('end', () => todo(onResEnd, res))
    }
  })
  // data事件内的错误不会在此回调
  req.on('error', (err) => deal(err))
  req.on('close', () => todo(onReqClose, req))
  data && req.write(data)
  req.end()
  return req
}

/*
  format('www.example.com') => http://www.example.com
  format('/a/b', 'http://www.example.com') => http://www.example.com/a/b

  format('https://www.example.com/a/b', 'http://www.example2.com')
  => https://www.example.com/a/b
 */
function formatUrl(url: string, base?: string | URL) {
  let result: URL
  if (base) {
    result = new URL(new URL(url, base).toString(), 'resolve://')
  } else {
    // 可能没有指定协议，默认http
    result = new URL(url.indexOf('//') === -1 ? `http://${url}` : url, 'resolve://')
  }
  return result
}

// options规范化
export function normalizeOptions(options: any): NormalizedOptions {
  try {
    options = { ...options }
  } catch (err) {
    throw new Error('invalid options! only object can be normalized!')
  }
  // 根据path, url, base重新生成path, protocol, port
  let url
  if (!options.path || !isString(options.path)) {
    const optUrl = options.url
    if (optUrl && (isURL(optUrl) || isString(optUrl))) {
      url = isURL(optUrl) ? optUrl : formatUrl(optUrl, options.base)
    } else {
      throw new Error('options must have string url or string path!')
    }
  } else {
    url = formatUrl(options.path)
  }
  options.host = url.host
  options.hostname = url.hostname
  options.port = url.port || 80
  options.protocol = url.protocol
  if (url.username && url.password) {
    options.auth = `${url.username}:${url.password}`
  }
  options.path = url.toString()
  delete options.url
  delete options.base
  // method: string
  options.method = options.method || 'GET'
  // headers: OutgoingHttpHeaders
  options.headers = options.headers || {}
  return options
}
