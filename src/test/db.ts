import Database from '@/core/db/Database'
// import { log } from '@/utils/util'

const log = (obj: any) => console.log(JSON.stringify(obj, null, 2))
// const db = new Database(['school', 'class', 'student', 'thing'], )
const db = new Database('G:/UM/test', 'test1', ['area', 'area2', 'school', 'class'], 'student')

db.set({
  area: 'Shenzhen',
  area2: 'sss',
  school: '学校1',
  class: '班级1'
}, { student: 'youddd', ppp: 'aaaaa' })

db.set({
  area: 'Shenzhen',
  area2: 'sss',
  school: '学校1',
  class: '班级1'
}, { student: 'youwww', ppp: 'cccc' })
db.set({
  area: 'Shenzhen',
  area2: 'ssss',
  school: '学校2',
  class: '班级1'
}, { student: 'youddd', ppp: 'bbbbbbb' })
// console.log(db.remove('tom'))
// log(
//   db._db
// )
// console.log(db.has({school: '学校2'}, true))
// console.log(db.has({school: '学校2', class: '班级2'}, true))
// console.log(db.has({a: 123, school: '学校1'}, true))
