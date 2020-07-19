
export interface ReqMeta {
  url: string,
  [prop: string]: DataProp
}

export type DataProp = string | number | boolean | null

export interface DataItem {
  [prop: string]: DataProp
}

