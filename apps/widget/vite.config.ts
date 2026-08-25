import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    lib: {
      entry: 'src/widget.ts',
      name: 'TemmuzSupportWidget',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
