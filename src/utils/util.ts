
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
    if (typeof target === 'object') {
      if (map.has(target)) {
        return map.get(target)
      }
      let cloneTarget: any = Object.prototype.toString.call(target) === '[object Array]' ? [] : {}
      let i = -1
      const keys = Object.keys(target)
      map.set(target, cloneTarget)
      while (++i < keys.length) {
        const key = keys[i]
        cloneTarget[key] = walkClone(target[key], map)
      }
      return cloneTarget
    } else {
      return target
    }
  }
  return walkClone(target)
}

// export function delay(time) {
//   return new Promise(resolve => setTimeout(resolve, time))
// }
