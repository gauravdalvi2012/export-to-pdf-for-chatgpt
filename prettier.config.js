/**
 * Prettier configuration
 * Configured for Prettier v3.10.1
 *
 * @type {import('prettier').Config}
 */
export default {
  // Always append semicolons for explicit statement termination
  semi: true,

  // Use single quotes for consistency across JS/TS code
  singleQuote: true,

  // Default indentation level of 2 spaces
  tabWidth: 2,

  // Indent with spaces rather than tabs for consistent rendering everywhere
  useTabs: false,

  // Avoid trailing commas in multiline object/array literals
  trailingComma: 'none',

  // Enforce Unix line endings (\n) across all operating systems (Windows, macOS, Linux)
  endOfLine: 'lf',

  // Filetype-specific formatting overrides
  overrides: [
    {
      // TypeScript & JavaScript source files: standard 2-space indentation
      files: ['*.ts', '*.js'],
      options: {
        tabWidth: 2
      }
    },
    {
      // HTML template & options UI: 4 spaces for clearer nested tag hierarchy
      files: '*.html',
      options: {
        tabWidth: 4
      }
    },
    {
      // JSON manifests & configs: compact 2-space indentation
      files: '*.json',
      options: {
        tabWidth: 2
      }
    }
  ]
};
