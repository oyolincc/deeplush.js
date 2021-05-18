
export type Callback<CbArgs extends any[]> = (...args: CbArgs) => any
export interface Handler<CbArgs extends any[]> {
  handler: Callback<CbArgs>
}
export interface NormalError {
  err: Error,
  [other: string]: any
}

export default class Emitter<CbArgs extends any[] = any[]> {
  private _evs: { [eventName: string]: Handler<CbArgs>[] }
  constructor() {
    this._evs = Object.create(null)
  }

  public on(event: string, fn: Callback<CbArgs>) {
    const evs = this._evs
    const item = { handler: fn }
    evs[event] || (evs[event] = [])
    evs[event].push(item)
  }

  public emit(event: string, ...args: CbArgs) {
    const evs = this._evs
    if (!evs[event]) {
      return
    }
    for (let i = 0; i < evs[event].length; i++) {
      evs[event][i].handler.apply(null, args)
    }
  }
}
