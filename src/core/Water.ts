import { isFunction, isArray } from '../utils/verify'

/* eslint-disable no-use-before-define */
export type SyncWaterFlow = (this: Water, source: any, info: SourceInfo) => any
export type AsyncWaterFlow = (this: Water, source: any, info: SourceInfo) => Promise<any>
export type SourceInfo = { index: number, total: number }
/* eslint-enable no-use-before-define */

export default class Water {
  private _states: any[]

  constructor(state: any) {
    if (state === undefined) {
      throw new Error('state can\'t be undefined, please use null!')
    }
    this._states = []
    this._states.push(state)
  }

  static source(states: any): Water {
    return new Water(null).resolve(states)
  }

  public resolve(states: any): Water {
    if (states === undefined) {
      throw new Error('states can\'t be undefined, please use null!')
    }
    if (isArray(states)) {
      this._states = states
    } else if (states && Object.prototype.hasOwnProperty.call(states, 'length')) {
      this._states = Array.prototype.slice.call(states)
    } else {
      this._states = [states]
    }
    return this
  }

  // water同步流动
  public flow(wf: SyncWaterFlow, strong: boolean = false): Water {
    if (!isFunction(wf)) {
      throw new TypeError('water flow should be a function!')
    }
    const waters: any[] = []
    const states = this._states
    for (let i = 0; i < states.length; i++) {
      let water: Water
      if (states[i] instanceof Water) {
        water = states[i].flow(wf)
      } else {
        let subStates
        const info = { index: i, total: states.length }
        try {
          subStates = wf.call(this, states[i], info)
        } catch (err) {
          if (strong) {
            waters.push(err)
            continue
          }
          throw err
        }
        if (subStates === undefined) {
          continue // 跳过undefined
        }
        water = Water.source(subStates)
      }
      waters.push(water)
    }
    return Water.source(waters)
  }

  // water异步流动
  public async asyncFlow(wf: AsyncWaterFlow, strong: boolean = true): Promise<Water> {
    if (!isFunction(wf)) {
      throw new TypeError('water flow should be a function!')
    }
    const waters: any[] = []
    const states = this._states
    for (let i = 0; i < states.length; i++) {
      let water: Water
      if (states[i] instanceof Water) {
        water = await states[i].asyncFlow(wf)
      } else {
        const info = { index: i, total: states.length }
        let subStates
        try {
          subStates = await wf.call(this, states[i], info)
        } catch (err) {
          if (strong) {
            waters.push(err)
            continue
          }
          throw err
        }
        if (subStates === undefined) {
          continue // 跳过undefined
        }
        water = Water.source(subStates)
      }
      waters.push(water)
    }
    return Water.source(waters)
  }

  public gather(result: any[] = []): any[] {
    let i = -1
    while (++i < this._states.length) {
      const state = this._states[i]
      if (state instanceof Water) {
        state.gather(result)
      } else {
        result.push(state)
      }
    }
    return result
  }
}
