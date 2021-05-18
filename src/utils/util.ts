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
