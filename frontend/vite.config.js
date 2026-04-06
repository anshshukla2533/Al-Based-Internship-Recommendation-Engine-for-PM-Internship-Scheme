import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const permissionsPolicy = [
  'microphone=(self "https://www.omnidim.io" "https://omnidim.io" "https://dashboard.staging.omnidim.io")',
].join(', ')
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Permissions-Policy': permissionsPolicy,
    },
  },
  preview: {
    headers: {
      'Permissions-Policy': permissionsPolicy,
    },
  },
})