import { isFunction, isArray } from '../utils/verify'

/* eslint-disable no-use-before-define */
type SyncWaterFlow = (this: Water, source: any, info: SourceInfo) => any
type AsyncWaterFlow = (
  this: Water,
  source: any,
  info: SourceInfo,
  callback: (subStates: any) => any
) => any
type WaterFlow = SyncWaterFlow | AsyncWaterFlow
type SourceInfo = { index: number, total: number }
/* eslint-enable no-use-before-define */

export default class Water {
  private _states: any[]

  constructor(state?: any) {
    this._states = []
    this._states.push(state)
  }

  static source(states: any): Water {
    return new Water().resolve(states)
  }

  public resolve(states: any): Water {
    if (isArray(states)) {
      this._states = states
    } else if (states && Object.prototype.hasOwnProperty.call(states, 'length')) {
      this._states = Array.prototype.slice.call(states)
    } else {
      this._states = [states]
    }
    return this
  }

  public flow(wf: SyncWaterFlow): Water
  public flow(wf: AsyncWaterFlow): Promise<Water>
  public flow(wf: WaterFlow): Water | Promise<Water> {
    if (!isFunction(wf)) {
      throw new TypeError('water flow should be a function!')
    }
    const waters: Water[] = []
    const states = this._states
    let result = null
    if (wf.length > 2) {
      // 异步模式
      result = (async() => {
        for (let i = 0; i < states.length; i++) {
          let water: Water
          if (states[i] instanceof Water) {
            water = await states[i].flow(wf)
          } else {
            const subStates = await new Promise<any>(resolve => {
              (wf as AsyncWaterFlow).call(
                this,
                states[i],
                { index: i, total: states.length },
                resolve
              )
            })
            water = Water.source(subStates)
          }
          waters.push(water)
        }
        return Water.source(waters)
      })()
    } else {
      // 同步模式
      for (let i = 0; i < states.length; i++) {
        let water: Water
        if (states[i] instanceof Water) {
          water = states[i].flow(wf)
        } else {
          water = Water.source((wf as SyncWaterFlow).call(
            this,
            states[i],
            { index: i, total: states.length }
          ))
        }
        waters.push(water)
      }
      result = Water.source(waters)
    }
    return result
  }

  public gather(): any[] {
    const states: any[] = []
    const queue: Water[] = [this]
    while (queue.length) {
      const water = queue.shift()!
      for (let i = 0; i < water._states.length; i++) {
        const state = water._states[i]
        const target = state instanceof Water ? queue : states
        target.push(state)
      }
    }
    return states
  }
}
