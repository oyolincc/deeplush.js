module.exports = {
  env: {
    es2020: true,
    node: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module'
  },
  rules: {
    'space-before-function-paren': ['error', 'never'],
    'no-unused-expressions': ['warn'],
    'no-unused-vars': ['warn'],
    'keyword-spacing': ['warn'],
    quotes: ['error', 'single'],
    semi: ['error', 'never']
  }
}
