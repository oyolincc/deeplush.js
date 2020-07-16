import { defineFreeze } from '@/utils/util'
import { DataItem, ReqMeta } from '@/global'
import Browser from '@/core/browser/Browser'
import { EtrOpt } from '@/core/assist/Extractor'
import Hooks, { HookInfo } from '@/core/assist/Hooks'
import HOOKS from './hooks'

export enum LcStatus {
  STATIC,
  RUNNING,
  INTERRUPT
}

export interface LcLevelMeta {
  reqMeta: ReqMeta,
  digData: DataItem[] | null,
  index: number
}

const { STATIC, RUNNING, INTERRUPT } = LcStatus

// 页面层级控制器 用于链式挖掘
export default class LevelController {
  // 指向被link的下一个层级控制器
  private _next: LevelController | null
  // 指向被link的上一个层级控制器
  private _prev: LevelController | null
  private _level: number
  private _extractOptions: EtrOpt
  private _hooks: Hooks<[LcLevelMeta[], LevelController, HookInfo]> | null
  // 运行状态 静止static/运行中running/中断interrupt/跳过skip
  private _status: LcStatus

  constructor(extractOptions: EtrOpt, hooks?: Hooks<[LcLevelMeta[], LevelController, HookInfo]> | null) {
      this._next = null
      this._prev = null
      this._level = 1
      this._extractOptions = extractOptions
      this._hooks = hooks || null
      this._status = STATIC
  }

  link(lc: LevelController) {
      if (!(lc instanceof LevelController)) {
        throw new Error('LevelController.link: link对象必须为LevelController')
      } else if (lc._prev) {
        throw new Error('LevelController.link: 不能将非头部作为link对象')
      } else if (this._next) {
        throw new Error('LevelController.link: 当前对象已被链接')
      }
      this._next = lc
      lc._prev = this
      lc._setLevel(this._level + 1)
      return lc
  }

  hasNext() {
    return !!this._next
  }
  // 跳过：当前LevelController设为中断
  skip() {
    this._status = INTERRUPT
  }
  // 中断：所有关联的LevelController设为中断
  interrupt(this: LevelController) {
    let temp: LevelController | null = this
    this._status = INTERRUPT
    while ((temp = temp._next)) {
      temp._status = INTERRUPT
    }
    temp = this
    while ((temp = temp._prev)) {
      temp._status = INTERRUPT
    }
  }

  isInterrupt() {
    return this._status === INTERRUPT
  }

  dig(browser: Browser, reqMeta: ReqMeta) {
    const initialLevelMeta: LcLevelMeta = {
      reqMeta,
      digData: null,
      index: 0
      // reqHeaders: {}
    }
    return this._dig(browser, reqMeta, [initialLevelMeta])
  }

  private _setLevel(level: string | number): void {
    const l = parseInt(String(level))
    this._level = l
    this._next && (this._next._setLevel(l + 1))
  }

  private async _notifyHooks(ev: string, levelMetaArr: LcLevelMeta[], err: Error | null) {
    const _hooks = this._hooks
    if (!_hooks) {
      return
    }

    const copyArr = levelMetaArr.concat()

    try {
      await _hooks.notify(ev, copyArr, this, { err, event: ev })
    } catch (err) {
      switch (ev) {
        case HOOKS.DIG_READY:
        case HOOKS.DIG_DONE:
        case HOOKS.DIG_OVER:
          try {
            await _hooks.notify(HOOKS.DIG_ERROR, copyArr, this, { err, event: ev })
          } catch (err2) {
            this.interrupt()
            throw err2
          }
          break
        case HOOKS.DIG_ERROR:
          throw err
      }
    }
  }

  // 每一层的信息包含：请求元 挖掘到的数据 请求元index
  private async _dig(browser: Browser, reqMeta: ReqMeta, levelMetaArr: LcLevelMeta[]) {
    const _next = this._next
    let digData = null

    // 如果是静止态，重设为运行态
    if (this._status === STATIC) {
      this._status = RUNNING
    } else {
      this._status = STATIC
      return
    }

    // 准备挖掘该层数据 HOOKS
    await this._notifyHooks(HOOKS.DIG_READY, levelMetaArr, null)
    /* 中断检测 */
    if (this.isInterrupt()) {
      this._status = STATIC
      return
    }

    try {
      digData = await browser.digData(reqMeta, this._extractOptions)
    } catch (err) {
      await this._notifyHooks(HOOKS.DIG_ERROR, levelMetaArr, err)
    }
    // const curMeta = levelMetaArr[this._level - 1]
    // curMeta.digData = digData
    // curMeta.reqHeaders = browser.cloneOptions().headers

    // 已挖掘到该层级数据 HOOKS
    await this._notifyHooks(HOOKS.DIG_DONE, levelMetaArr, null)

    /* 中断检测 */
    if (this.isInterrupt()) {
      this._status = STATIC
      return
    }

    if (_next && digData) {
      for (let i = 0; i < digData.length; i++) {
        // 已确定下一次挖掘的入口
        const levelMeta: LcLevelMeta = {
          reqMeta: digData[i],
          digData: null,
          index: i
        }
        levelMetaArr.push(levelMeta)
        // 调用下一层挖掘数据
        await _next._dig(browser.clone(), digData[i], levelMetaArr)

        // 该reqMeta下层挖掘完毕 HOOKS
        await this._notifyHooks(HOOKS.DIG_OVER, levelMetaArr, null)
        levelMetaArr.pop()

        /* 中断检测 */
        if (this.isInterrupt()) {
          this._status = STATIC
          return
        }
      }
    }

    this._status = STATIC
    // else return digData
  }
}

defineFreeze(LevelController, 'hooks', HOOKS)
