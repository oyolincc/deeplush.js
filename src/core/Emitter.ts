export interface Handler {
  handler: Function
}

export default class Emitter {
  private _evs: { [eventName: string]: Handler[] }
  constructor() {
    this._evs = Object.create(null)
  }

  public on(event: string, fn: Function) {
    const evs = this._evs
    const item = { handler: fn }
    evs[event] || (evs[event] = [])
    evs[event].push(item)
  }

  public emit(event: string, ...args: any) {
    const evs = this._evs
    if (!evs[event]) {
      return
    }
    for (let i = 0; i < evs[event].length; i++) {
      evs[event][i].handler.apply(null, args)
    }
  }

  public has(event: string) {
    return !!(this._evs[event] && this._evs[event].length)
  }
}
