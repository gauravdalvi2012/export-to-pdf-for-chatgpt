/** @type {import('prettier').Config} */
export default {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  useTabs: false,
  trailingComma: 'none',
  endOfLine: 'lf',
  // Specific spacing overrides per filetype
  overrides: [
    {
      files: ['*.ts', '*.js'],
      options: {
        tabWidth: 2
      }
    },
    {
      files: '*.html',
      options: {
        tabWidth: 4
      }
    },
    {
      files: '*.json',
      options: {
        tabWidth: 2
      }
    }
  ]
};
