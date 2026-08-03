import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [
        reactCompilerPreset({
          compilationMode: 'all',
        }),
      ],
    }),
    dts(),
  ],
  build: {
    lib: {
      name: 'canvas-glide',
      entry: 'src/lib.ts',
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/compiler-runtime',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },

  base: '/canvas-drift/dist/',
});
