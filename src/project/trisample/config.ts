import * as HPA from 'https-proxy-agent'
import { EtrOpt } from '@/core/assist/Extractor'
import { DownloaderOpt } from '@/core/task/Downloader'

// taskType
export const TT = {
  BROWSE_DONE: 'BROWSE_DONE',
  BROWSE_ERROR: 'BROWSE_ERROR',
  DOWNLOAD_ABORT: 'DOWNLOAD_ABORT',
  DOWNLOAD_ING: 'DOWNLOAD_ING',
  DOWNLOAD_DONE: 'DOWNLOAD_DONE',
  DOWNLOAD_ERROR: 'DOWNLOAD_ERROR'
}

export const resourceKey = 'title'

const proxy = 'http://127.0.0.1:1081'

const agent = new HPA.HttpsProxyAgent(proxy)

export const reqOptions = {
  agent,
  headers: {
    Connection: 'keep-alive',
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.131 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
  }
}

export const extractOptions: EtrOpt[] = [
  {
    '#x-iso-container > article > .entry-wrap .entry-title > a': {
      url: $item => $item.attr('href') || null,
      title: $item => $item.text().trim()
    }
  },
  {
    '.wp-block-button > .wp-block-button__link': {
      url: $item => $item.attr('href') || null
    }
  }
]

export const downloaderOption: DownloaderOpt = {
  TQMax: 3,
  PTQMax: 2,
  interval: 1000,
  options: {
    maxSize: 640 * 1024 * 1024, // 640MB
    extRegExp: null,
    // maxThreshold: 32 * 1024 * 1024
    maxThreshold: 128 * 1024
  }
}

export const root = 'G:/UM/trisamples'
export const target = 'https://trisamples.com/category/free-downloads/'
