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
