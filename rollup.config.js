import alias from 'rollup-plugin-alias'
import json from '@rollup/plugin-json'
import typescript from 'rollup-plugin-typescript2'
import { terser } from 'rollup-plugin-terser'
import path from 'path'

const aliasOptions = {
  resolve: ['.js', '.json', '.ts'],
  entries: {
    '@': path.resolve(__dirname, 'src')
  }
}

const plugins = [
  typescript({ tsconfig: 'tsconfig.json' }),
  json(),
  alias(aliasOptions)
]
const prod = !!process.env.PROD
const input = './src/index.ts'

prod && (plugins.push(terser()))
const file = `./dist/spider.${prod ? 'min.' : ''}js`

export default [{
  input,
  output: {
    file,
    format: 'cjs'
  },
  plugins
  // external: ['https', 'url', 'fs', 'util', 'path']
}]
