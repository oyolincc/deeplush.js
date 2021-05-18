import { poll } from '../../utils/util'
import Emitter from '../Emitter'

/* eslint-disable no-use-before-define */
export const taskerHooks = {
  END: 'TaskerEnd',
  FINISH: 'TaskerFinish'
}

export interface TaskerOptions {
  max: number
  doingMax: number
  interval: number
  [other: string]: any
}

export type Executor<Task> = (
  this: Tasker<Task>,
  task: Task,
  end: () => any
) => any
/* eslint-enable no-use-before-define */

export default class Tasker<Task = any> extends Emitter {
  protected _options: TaskerOptions
  protected _waiting: Task[] // 待执行队列
  protected _doingCount: number // 正在执行的数目
  protected _pollingFunc: ((stop: Function) => void) | null
  protected _exec?: Executor<Task>
  // 总任务数 = 待执行 + 正在执行
  constructor(options: TaskerOptions) {
    super()
    const numberProp = ['max', 'doingMax', 'interval']
    numberProp.forEach(prop => {
      if (options[prop] <= 0) {
        throw new Error('invalid tasker options!')
      }
    })
    if (options.max < options.doingMax) {
      throw new Error('invalid max and doingMax')
    }

    this._options = {
      max: parseInt(String(options.max)),
      doingMax: parseInt(String(options.doingMax)),
      interval: parseInt(String(options.interval))
    }
    this._waiting = []
    this._doingCount = 0
    this._pollingFunc = null
  }

  protected _getOptions() {
    return this._options
  }

  // 取任务
  protected _do() {
    if (!this._waiting.length || this._doingCount >= this._options.doingMax) {
      return
    }

    const task = this._waiting.shift() as Task
    this._doingCount++ // 任务数加一
    this._exec && this._exec(task, () => { this._end(task) })
  }

  protected _end(task: Task) {
    this._doingCount--
    this.emit(taskerHooks.END, task)
    if (!this._waiting.length && !this._doingCount) {
      // 已完成所有任务
      this.emit(taskerHooks.FINISH)
    }
  }

  // 添加新的待处理任务
  public todo(task: Task) {
    if (this.isEnable()) {
      this._waiting.push(task)
    } else {
      throw new Error('exceeded the maximum number of executions!')
    }
  }

  public isStop() {
    return !this._pollingFunc
  }

  public stop() {
    this._pollingFunc = null
  }

  // 是否可以添加任务
  public isEnable() {
    return this._waiting.length < this._options.max - this._doingCount
  }

  // 获取正在等待任务数
  public getWaitingCount() {
    return this._waiting.length
  }

  // 获取正在执行任务数
  public getProcessingCount() {
    return this._doingCount
  }

  // 开始定时取任务
  public start(exec: Executor<Task>) {
    if (this._pollingFunc) {
      throw new Error('tasker has been started!')
    }
    this._exec = exec
    const pollingFunc = (stop: Function) => {
      if (this._pollingFunc !== pollingFunc) {
        stop()
        return
      }
      this._do()
    }
    this._pollingFunc = pollingFunc
    poll(pollingFunc, this._options.interval, true)
  }
}
