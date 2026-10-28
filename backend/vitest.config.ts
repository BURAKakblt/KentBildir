import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, '../mobile/src'),
      'expo-file-system': path.resolve(root, 'src/test/expoFileSystem.ts'),
      'react-native': path.resolve(root, 'src/test/reactNative.ts'),
    },
  },
});
