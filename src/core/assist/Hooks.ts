
export type HookError = { err: Error | null, event: string }

export type Callback<CbArgs extends any[]> = (...args: CbArgs) => any

export interface Handler<CbArgs extends any[]> {
  handler: Callback<CbArgs>
}

// 能够实现异步回调的简易eventEmitter
export default class Hooks<CbArgs extends any[] = any[]> {

  _: { [eventName: string]: Handler<CbArgs>[] }

  constructor() {
    this._ = Object.create(null)
  }

  register(event: string, fn: Callback<CbArgs>) {
    const _ = this._
    const item = { handler: fn }
  
    _[event] || (_[event] = [])
    _[event].push(item)
  }

  async notify(event: string, ...args: CbArgs) {
    const _ = this._
  
    if (!_[event]) {
      return
    }
  
    for (let i = 0; i < _[event].length; i++) {
      await _[event][i].handler.apply(null, args)
    }
  }
}
