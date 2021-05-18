import * as cheerio from 'cheerio'

type Root = cheerio.Root
type Cheerio = cheerio.Cheerio
type Element = cheerio.Element

interface QueryIns {
  (selector: any): Cheerio
  _: Root
  map: <T>(qs: Cheerio, callback: (index: number, element: Element) => any) => T[]
}

export default function Query(document: string | Buffer) {
  function query(selector: any) {
    return query._(selector)
  }
  query._ = cheerio.load(document)
  Object.setPrototypeOf(query, Query.prototype)
  return query as QueryIns
}

Query.prototype.map = function<T>(
  qs: Cheerio,
  callback: (index: number, element: Element) => any
) {
  const result: T[] = []
  qs.each((idx, el) => result.push(callback(idx, el)))
  return result
}
