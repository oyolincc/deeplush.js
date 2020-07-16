// // import Hooks from '@/core/Hooks/Hooks'

/**
 * TQMax 待执行任务队列最大任务数
 * PTQMax 执行中的任务队列最大数
 * interval 取新任务放入执行队列的间隔
 */
export interface TaskerMain {
  TQMax: number,
  PTQMax: number,
  interval: number,
  [other: string]: any
}
export type Task<T extends any = any> = T

export interface TaskerOpt<T extends any = any> extends TaskerMain {
  /**
   * @param task 执行的任务
   * @param end 结束任务函数
   */
  exec: (task: Task<T>, end: (this: Tasker<T>) => any) => any
}


export default class Tasker<T extends any = any> {
  protected _TQ: Task<T>[]
  protected _taskerOpt: TaskerOpt<T>
  protected _doing: number
  protected _timer: NodeJS.Timeout | null
  protected readonly _thisStart: Function
  // 总任务数 = 待执行 + 正在执行
  constructor(options: TaskerOpt) {
    const numberProp = ['TQMAX', 'PTQMAX', 'interval']
    numberProp.forEach(prop => {
      if (options[prop] <= 0) {
        throw new Error('Tasker.create: taskOptions属性小于0，不合法')
      }
    })

    this._taskerOpt = {
      TQMax: parseInt(String(options.TQMax)),
      PTQMax: parseInt(String(options.PTQMax)),
      interval: parseInt(String(options.interval)),
      exec: options.exec
    }
    this._TQ = []
    this._doing = 0
    this._timer = null
    this._thisStart = this._start.bind(this)
  }
  /**
   * 添加新任务到TQ
   */
  todo(task: Task<T>) {
    if (this._TQ.length < this._taskerOpt.TQMax) {
      this._TQ.push(task)
    } else {
      throw new Error('Tasker<todo>: 超过最大任务限度')
    }
  }

  isStop() {
    return !this._timer
  }

  stop() {
    this._timer = null
  }

  getEnable() {
    return this._TQ.length < this._taskerOpt.TQMax
  }

  getWaitingCount() {
    return this._TQ.length
  }

  getProcessingCount() {
    return this._doing
  }
  /**
   * 是否有正在执行的任务
   */
  hasProcessing() {
    return !!this._doing
  }
  /**
   * 开始定时取任务
   */
  start() {
    const { _thisStart, _taskerOpt: interval } = this
    if (!this._timer) {
      // this._do().then(() => {
      //   this._timer = setTimeout(_thisStart, interval)
      // })
      this._do()
      // @ts-ignore
      this._timer = setTimeout(_thisStart, interval)
    }
  }

  protected _start() {
    const { _thisStart, _taskerOpt: interval } = this
    if (this._timer) {
      this._do()
      // @ts-ignore
      this._timer = setTimeout(_thisStart, interval)
    }
  }
  /**
   * 从TQ取任务到PTQ，处理任务，执行函数是由用户指定的异步方法，直到调用end
   */
  protected _do() {
    if (!this._TQ.length || this._doing >= this._taskerOpt.PTQMax) {
      return
    }
  
    const task = <Task<T>>this._TQ.shift()
    this._doing++ // 任务数加一
    this._taskerOpt.exec(task, this._end.bind(this))
  }

  protected _end() {
    this._doing--
  }
  
}







