import { isString, isURL, isObject } from '../utils/verify'
import {
  request as httpRequest,
  IncomingMessage,
  RequestOptions as RO,
  ClientRequest
} from 'http'
import { request as httpsRequest } from 'https'

interface CallbackOptions {
  onResHeaders?: (res: IncomingMessage, abort: () => void) => any
  onResData?: (res: IncomingMessage, chunk: Buffer, abort: () => void) => any
  onResEnd?: (res: IncomingMessage) => any
  onReqClose?: (req: ClientRequest) => any,
  onError?: (err: Error) => any
}

interface RequestOptions extends RO {
  url?: string | URL
  base?: string | URL
}

interface RequestContent {
  response: IncomingMessage
  buffer: Buffer
}

interface Normalizable<Result> {
  (options: RequestOptions): Result
  (url: string | URL, options?: RequestOptions | null): Result
  (url: string, base: string | URL, options?: RequestOptions | null): Result
}

// 根据变参转换为合法的请求参数
const createNormalizedOptions: Normalizable<RO> = function(a: any, b?: any, c?: any) {
  const l = arguments.length
  if (l === 1) {
    if (isObject(a)) {
      return normalizeOptions(a)
    } else {
      return normalizeOptions({ url: a })
    }
  } else if (l === 2) {
    if (isString(b) || isURL(b)) {
      if (!isString(a)) {
        throw new Error('invalid url with base!')
      }
      return normalizeOptions({ url: a, base: b })
    } else {
      return normalizeOptions({ ...b, url: a })
    }
  } else {
    if (!isString(a)) {
      throw new Error('invalid url with base!')
    }
    return normalizeOptions({ ...c, url: a, base: b })
  }
}

// 获取请求的内容
export const fetchContent: Normalizable<Promise<RequestContent>> = function(...args: any[]) {
  const chunks: Buffer[] = []
  const callbackOpts: CallbackOptions = {
    onResData: (res, chunk) => chunks.push(chunk)
  }
  const prom = new Promise<RequestContent>((resolve, reject) => {
    callbackOpts.onResEnd = res => {
      resolve({
        response: res,
        buffer: Buffer.concat(chunks)
      })
    }
    callbackOpts.onError = err => reject(err)
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
  const mainArgs = Array.prototype.slice.call(arguments, 0, arguments.length - 1)
  const callbackOpts = arguments[arguments.length - 1]
  if (mainArgs.length === 3 && !mainArgs[2]) {
    mainArgs[2] = {}
  } else if (mainArgs.length === 2 && !isString(mainArgs[1]) && !mainArgs[1]) {
    mainArgs[1] = {}
  }
  const ro = createNormalizedOptions.apply(
    null,
    mainArgs as Parameters<typeof createNormalizedOptions>
  )
  if (ro.protocol === 'http:') {
    return createHttpRequest(ro, callbackOpts)
  } else if (ro.protocol === 'https:') {
    return createHttpsRequest(ro, callbackOpts)
  } else {
    throw new Error('only support http or https')
  }
}

export function createHttpRequest(options: RO, callbackOpts: CallbackOptions) {
  return request(httpRequest, options, callbackOpts)
}

export function createHttpsRequest(options: RO, callbackOpts: CallbackOptions) {
  return request(httpsRequest, options, callbackOpts)
}

function request(
  method: typeof httpRequest | typeof httpsRequest,
  options: RequestOptions,
  callbackOpts: CallbackOptions
) {
  const { onResHeaders, onResData, onResEnd, onReqClose, onError } = callbackOpts
  const deal = (err: Error) => {
    if (onError) {
      onError(err)
    } else {
      throw err
    }
  }
  const todo = (fn?: Function, ...args: any[]) => {
    try {
      fn && fn(...args)
    } catch (err) {
      deal(err)
    }
  }
  const req = method(options, res => {
    const abort = () => req.destroy()
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
function normalizeOptions(options: RequestOptions): RO {
  options = <RequestOptions>{ ...options }
  if (options.url) {
    let url: URL
    if (isURL(options.url)) {
      url = options.url
    } else {
      url = formatUrl(options.url, options.base)
    }
    options.host = url.host
    options.hostname = url.hostname
    options.port = url.port || 80
    options.protocol = url.protocol
    if (url.username && url.password) {
      options.auth = `${url.username}:${url.password}`
    }
    options.path = url.toString()
  }
  delete options.url
  delete options.base
  return options
}
