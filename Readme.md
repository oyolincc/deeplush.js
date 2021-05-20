# 简要文档

## 概要

本库自己闹着玩开发，旨在将爬虫流程简单化。对于SPA应用，可联合Puppeteer.js爬取，对于服务端渲染式页面，本库可以发挥极大的作用。

```typescript
import {
  createRequest,
  normalizeOptions
} from './core/createRequest'
import Database from './core/Database'
import Query from './core/domQuery'
import Emitter from './core/Emitter'
import MiniBrowser from './core/MiniBrowser'
import Water from './core/Water'
import Tasker from './core/task/Tasker'
import Downloader from './core/task/Downloader'

export default {
  requestUtil: {
    createRequest,
    normalizeOptions
  },
  Database,
  Query,
  Emitter,
  MiniBrowser,
  Water,
  Tasker,
  Downloader
}
```

库主要导出以上对象/方法。

## Request

* createRequest()：用于创建一个请求，传参见代码ts定义。
* normalizeOptions()：用于将请求配置标准化、归一化。

通常你不需要使用这两个方法处理这些逻辑，MiniBrowser已经内部封装。

## MiniBrowser

迷你浏览器，访问网页可自动带上/保存Referer、Cookie、Host。

* newTab( )：创建一个BrowserTab
* BrowserTab：可调用to方法访问网页

MiniBrowser和BrowserTab实例均有newTab方法，区别在于前者需传初始的请求配置，后者基于父tab之上复制出tab。

## Query

基于css选择器解析一个document，内部使用cheerio库，详情看test事例。

## Water

是网式爬虫索取数据的基础，例子：

```js
const todo = () => {
  const water = Water.source({ a: 1 })
    .flow((source: any, info: any) => {
      console.log('flow 1 层', JSON.stringify(source))
      return [{ b: 1 }, { b: 2 }, { b: 3 }, { b: 4 }]
    })
    .flow((source: any, info: any) => {
      console.log('flow 2 层', JSON.stringify(source))
      return Array.apply(null, { length: 3 } as any).map((item, idx) => ({
        ...source,
        c: idx
      }))
    })
  console.log(water.gather())
}
todo()

/*
输出：
flow 1 层 {"a":1}
flow 2 层 {"b":1}
flow 2 层 {"b":2}
flow 2 层 {"b":3}
flow 2 层 {"b":4}
[
  { b: 1, c: 0 }, { b: 1, c: 1 },
  { b: 1, c: 2 }, { b: 2, c: 0 },
  { b: 2, c: 1 }, { b: 2, c: 2 },
  { b: 3, c: 0 }, { b: 3, c: 1 },
  { b: 3, c: 2 }, { b: 4, c: 0 },
  { b: 4, c: 1 }, { b: 4, c: 2 }
]
*/
```

异步Water见test事例。

## Downloader

下载器，支持开启、关闭、每x秒检查是否有新任务、最大并行处理任务数、最大总任务数。



其他的见代码，反正不会有人用。懒得写了



