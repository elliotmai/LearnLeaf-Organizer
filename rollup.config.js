// rollup.config.js
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

export default {
  input: 'src/main.js',
  output: {
    file: 'dist/bundle.js',
    format: 'umd'
  },
  plugins: [
    css({ output: 'bundle.css' }), 
    terser(),
  ],
  external: ['@mui/material', '@mui/icons-material'],
};