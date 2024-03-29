module.exports = {
  env: {
    es2021: true,
    node: true
  },
  extends: [
    'standard'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    'no-redeclare': ['off'],
    'no-dupe-class-members': ['off'],
    'no-new-func': ['off'],
    'space-before-function-paren': ['error', 'never'],
    'no-unused-expressions': ['warn'],
    'no-unused-vars': ['warn'],
    'handle-callback-err': ['warn'],
    'keyword-spacing': ['warn'],
    quotes: ['error', 'single'],
    semi: ['error', 'never']
  }
}
