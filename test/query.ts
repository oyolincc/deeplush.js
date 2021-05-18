import * as fs from 'fs'
import * as pathLib from 'path'
import Query from '../src/core/domQuery'

const q = Query(fs.readFileSync(pathLib.resolve(__dirname, '../test/srgirl.html')))
const qs = q('#category_grid .category_newlist li')
// q.map(qs, (idx, el) => {
//   return 2
// })
