// // import '@/global/index'
// // import './test/task'
// // import './test/camcam/index'
import Database from './core/db/Database'

const db = new Database(['school', 'class', 'student', 'thing'], 'G:/UM/test', 'test1')

// db.set({
//   school: '学校1',
//   class: '班级1',
//   student: 'TOM',
//   thing: '水杯',
//   value: '123'
// })
// db.set({
//   school: '学校1',
//   class: '班级1',
//   student: 'MARRY',
//   thing: '水杯',
//   value: '456'
// })
const log = (obj: any) => console.log(JSON.stringify(obj, null, 2))
log(db.has({
  school: '学校1',
  class: '班级1',
  student: 'TM',
  thing: '水杯',
  value: '456'
}))
// console.log(db.remove({ school: '学校2' }))
// console.log(db.has({school: '学校2'}, true))
// console.log(db.has({school: '学校2', class: '班级2'}, true))
// console.log(db.has({a: 123, school: '学校1'}, true))