import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import assetVersions from './scripts/asset-versions.mjs';
// assetVersions: content-hashed ?v= on every /assets URL (see scripts/asset-versions.mjs).
export default defineConfig({plugins:[react(),assetVersions()],server:{port:5173},build:{chunkSizeWarningLimit:1500}});
