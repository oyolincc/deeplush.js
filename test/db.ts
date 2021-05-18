import * as pathLib from 'path'
import Database from '../src/core/Database'

const log = (obj: any) => console.log(JSON.stringify(obj, null, 2))
// const db = new Database(['school', 'class', 'student', 'thing'], )
const db = new Database(
  pathLib.resolve(__dirname, '../temp'),
  'db',
  ['area', 'area2', 'school', 'class'],
  'student'
)

// db.remove('学生3')
// log(db.get(['学生3', '学生2']))

// db.set({
//   area: 'Shenzhen',
//   area2: 'aaa',
//   school: '学校1',
//   class: '班级1'
// }, { student: '学生2', ppp: 'cccc' })
// db.set({
//   area: 'Shenzhen',
//   area2: 'bbb',
//   school: '学校2',
//   class: '班级1'
// }, { student: '学生3', ppp: 'bbbbbbb' })

// db.remove('学生1')
