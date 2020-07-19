import { EtrOpt } from '@/core/assist/Extractor'
import Hooks, { HookError } from '@/core/assist/Hooks'
import LevelController, { LcLevelMeta } from '@/core/levelController/LevelController'
import { ReqMeta } from '@/global'
import Browser from '@/core/browser/Browser'
import { log } from '@/utils/util'

export type BrowseFilter = (reqMeta: ReqMeta, levelMetaArr: LcLevelMeta[]) => boolean
export type BrowseDataCb = (digData: ReqMeta[] | null) => any
export type BrowseErrorCb = (reqMeta: ReqMeta, errInfo: HookError) => any

export interface BrowseConfig {
  logOver?: boolean,
  extractOptions: EtrOpt[],
  filter: BrowseFilter,
  onData: BrowseDataCb,
  onError: BrowseErrorCb
}

export default class Browse {
  private _headController: LevelController | null
  private _maxLevel: number

  constructor(config: BrowseConfig) {
    const { extractOptions, filter, onData, onError, logOver } = config
    let headController = null
    let prev = null
    const maxLevel = extractOptions.length
    const browseHooks = new Hooks<[LcLevelMeta[], LevelController, HookError]>()
    this._maxLevel = maxLevel
    this._initHooks(browseHooks, filter, onData, onError, logOver === false ? logOver : true)
    for (let i = 0; i < maxLevel; i++) {
      const newController = new LevelController(extractOptions[i], browseHooks)
      prev = prev ? prev.link(newController) : (headController = newController)
    }
    this._headController = headController
  }

  start(browser: Browser, reqMeta: ReqMeta) {
    if (!this._headController) {
      throw new Error('headController is null!')
    }
    return this._headController.dig(browser, reqMeta)
  }

  private _initHooks(
    hooks: Hooks<[LcLevelMeta[], LevelController, HookError]>,
    filter: BrowseFilter,
    onData: BrowseDataCb,
    onError: BrowseErrorCb,
    logOver: boolean
  ) {
    hooks.register(LevelController.hooks.DIG_READY, (levelMetaArr, lc) => {
      const level = levelMetaArr.length
      if (!filter(levelMetaArr[level - 1].reqMeta, levelMetaArr)) {
        lc.skip() // 过滤失败，跳过该任务
        return
      }
    })
    hooks.register(LevelController.hooks.DIG_DONE, async(levelMetaArr) => {
      const level = levelMetaArr.length
      if (level === this._maxLevel) {
        await onData(levelMetaArr[level - 1].digData) // 阻塞
      }
    })
    logOver && hooks.register(LevelController.hooks.DIG_OVER, (levelMetaArr, lc) => {
      const level = levelMetaArr.length
      if (level > 1) {
        const index = levelMetaArr[level - 1].index
        const digData = levelMetaArr[level - 2].digData
        log(`第${level - 1}层中第${index + 1}/${digData ? digData.length : 0}目标入口爬取结束`)
      }
    })
    hooks.register(LevelController.hooks.DIG_ERROR, async(levelMetaArr, lc, errObj) => {
      onError(levelMetaArr[levelMetaArr.length - 1].reqMeta, errObj)
    })
  }
}
