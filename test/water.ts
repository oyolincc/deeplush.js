import Water from '../src/core/Water'
import { delay } from '../src/utils/util'

const delayTime = [800, 1500, 400, 3000]
const todo = async() => {
  const water = await (await Water.source({ a: 1 })
    .asyncFlow(async(source: any, info: any) => {
      console.log('flow 1 层')
      await delay(3000)
      return [{ b: 1 }, { b: 2 }, { b: 3 }, { b: 4 }]
    })
  ).asyncFlow(async(source: any, info: any) => {
    await delay(delayTime[info.index])
    console.log('flow 2 层')
    if (info.index === 2 || info.index === 1) {
      return
    }
    return Array.apply(null, { length: 3 } as any).map(i => ({
      ...source,
      index: info.index
    }))
  })
  const water2 = water.flow((s) => {
    return false
  })
  console.log(water2.gather())
}
todo()
