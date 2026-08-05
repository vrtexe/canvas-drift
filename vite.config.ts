import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), dts({ tsconfigPath: './tsconfig.app.json' })],
  build: {
    lib: {
      name: 'canvas-glide',
      entry: 'src/canvas-glide.ts',
      fileName: 'canvas-glide',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Consumers may run babel-plugin-react-compiler over this file (e.g.
        // when it is file:-linked and escapes their node_modules exclude).
        // The directive tells the compiler the dist is already built and must
        // not be re-compiled.
        banner: `'use no memo';`,
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react/jsx-runtime': 'ReactJsxRuntime',
        },
      },
    },
  },
});
