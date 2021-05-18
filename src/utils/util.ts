export function noob() {}

export function merge(dest: any, src: any, byDest = false) {
  const props = Object.getOwnPropertyNames(src)
  for (let i = 0; i < props.length; i++) {
    const prop = props[i]
    if (!byDest || Object.prototype.hasOwnProperty.call(dest, prop)) {
      dest[prop] = src[prop]
    }
  }

  return dest
}

export function pathRegex(path: string): RegExpExecArray | null {
  return /(.+)[\\/]([^\\/]+)$/.exec(path)
}

export function simpleDeepClone(target: any): any {
  function walkClone(target: any, map = new WeakMap()): any {
    const type = Object.prototype.toString.call(target)
    if (type !== '[object Object]' && type !== '[object Array]') {
      return target
    }
    if (map.has(target)) {
      return map.get(target)
    }
    let i = -1
    const cloneTarget: any = type === '[object Array]' ? [] : {}
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

// 延时
export function delay(time: number) {
  return new Promise(resolve => setTimeout(resolve, time))
}

// 轮询
export function poll(
  fn: (stop: Function) => any,
  interval: number,
  immediate: boolean = false
) {
  let timer: any = null
  function stop() {
    clearTimeout(timer)
    timer = null
  }
  function pollFunc() {
    fn(stop)
    if (timer) {
      timer = setTimeout(pollFunc, interval)
    }
  }
  if (immediate) {
    fn(stop)
  }
  timer = setTimeout(pollFunc, interval)
}
