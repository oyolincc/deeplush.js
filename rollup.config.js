import typescript from 'rollup-plugin-typescript2'
import path from 'path'
import { terser } from 'rollup-plugin-terser'
// import json from '@rollup/plugin-json'

const outputDir = './dist'
const input = './src/index.ts'
const isProd = !!process.env.PROD
const tsConfig = {
  tsconfig: 'tsconfig.json'
}
const plugins = [
  typescript(tsConfig)
]

if (isProd) {
  plugins.push(terser())
}

export default [{
  input,
  output: {
    file: path.resolve(__dirname, outputDir, 'spider.js'),
    format: 'cjs',
    exports: 'auto'
  },
  plugins,
  external: ['http', 'https', 'url', 'fs', 'util', 'path']
}]
