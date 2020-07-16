
export interface ReqMeta {
  url: string,
  [prop: string]: DataProp
}

export type DataProp = string | number | boolean | null

export interface DataItem {
  [prop: string]: DataProp
}











// export interface Browser {
//   resolve(url: string): string
//   extract(extractOptions: Extractor.Options, extra?: DataItem): DataItem[]
//   digData(reqMeta: ReqMeta, extractOptions: Extractor.Options): Promise<ReqMeta[]>
//   clone(): Browser
//   cloneOptions(): Request.VerifyOpt | null
//   go(options: Request.UnknownOpt): Promise<{ ext: string, buffer: Buffer }>
// }

// export interface LevelController {
//   link(lc: LevelController): LevelController
//   hasNext(): boolean
//   /**
//    * 跳过，当前LevelController状态设为中断
//    */
//   skip(): void
//   /**
//    * 中断，所有关联的LevelControlle状态r设为中断
//    */
//   interrupt(this: LevelController): void
//   dig(browser: Browser, reqMeta: ReqMeta): any
//   isInterrupt(): boolean
// }

// export interface Tasker {
//   todo(task: Tasker.Task): void
//   isStop(): boolean
//   stop(): void
//   getEnable(): boolean
//   getWaitingCount(): number
//   getProcessingCount(): number
//   hasProcessing(): boolean
//   start(): void
// }

// export namespace Tasker {
// }

// export interface Downloader extends Tasker {

// }

