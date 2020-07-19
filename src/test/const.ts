import * as HPA from 'https-proxy-agent'

const proxy = 'http://127.0.0.1:1081'

export const agent = new HPA.HttpsProxyAgent(proxy)

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

// export const PJ_SOURCE = 'G:/UM/source/asiansister'
// export const PJ_DIST = 'G:/UM/dist/asiansister'
