
export function noob() {} // 空函数

export function pathRegex(path: string): RegExpExecArray | null {
  return /(.+)[\\/]([^\\/]+)$/.exec(path)
}

export function parseSize(size: number | string): string {
  const unit: string[] = ['B', 'KB', 'MB', 'GB']
  let index: number = 0
  size = parseInt(String(size))
  size = isNaN(size) ? 0 : Math.abs(size)
  while (size >= 1024) {
    size /= 1024
    index++
  }
  return (index ? size.toFixed(2) : size) + unit[index]
}

export function parseTime(time: number | string): string {
  const date = new Date(parseInt(String(time)))
  const min = date.getMinutes()
  const sec = date.getSeconds()
  return `${min ? min + '分钟' : ''}${sec ? sec + '秒' : ''}`
}
 
export function defineFreeze(o: object, prop: string, value: any): void {
  Object.defineProperty(o, prop, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze(value)
  })
}

export function iterateObject<Value>
(
  source: { [k: string]: Value },
  cb: (key: string, value: Value) => any
): void {
  const keys = Object.keys(source)
  for (let i = 0; i < keys.length; i++) {
    cb(keys[i], source[keys[i]])
  }
}

export function deepClone(target: any): any {
  function walkClone(target: any, map = new WeakMap()): any {
    const type = Object.prototype.toString.call(target)
    if (type !== '[object Object]' && type !== '[object Array]') {
      return target
    }
    if (map.has(target)) {
      return map.get(target)
    }
    let cloneTarget: any = type === '[object Array]' ? [] : {}
    let i = -1
    const keys = Object.keys(target)
    map.set(target, cloneTarget)
    while (++i < keys.length) {
      const key = keys[i]
      cloneTarget[key] = walkClone(target[key], map)
    }
    return cloneTarget
  }
  return walkClone(target)
}

export function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}

export const log = console.log
