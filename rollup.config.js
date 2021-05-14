import typescript from 'rollup-plugin-typescript2'
import path from 'path'
// import json from '@rollup/plugin-json'
// import { terser } from 'rollup-plugin-terser'

const plugins = [
  typescript({
    tsconfig: 'tsconfig.json'
  })
]

const outputDir = './dist'
const input = './src/index.ts'

export default [{
  input,
  output: {
    file: path.resolve(__dirname, outputDir, 'spider.js'),
    format: 'cjs',
    exports: 'auto'
  },
  plugins
  // external: ['https', 'url', 'fs', 'util', 'path']
}]
