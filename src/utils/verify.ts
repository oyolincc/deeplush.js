
export function isObject(o: any): o is object {
  // return Object.prototype.toString.call(o) === '[object Object]'
  return o && typeof o === 'object'
}

export function isNumber(n: any): n is number {
  return typeof n === 'number'
}

export function isArray(a: any): a is any[] {
  return Object.prototype.toString.call(a) === '[object Array]'
}

export function isFunction(f: any): f is Function {
  return typeof f === 'function'
}

export function isString(s: any): s is string {
  return typeof s === 'string'
}
