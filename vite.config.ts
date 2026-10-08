import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VoiceStudio chạy cục bộ (mặc định cổng 3900). Proxy qua Vite để tránh lỗi CORS
// khi trình duyệt gọi trực tiếp. Đổi đích bằng biến môi trường VOICESTUDIO_URL.
const voiceStudioTarget = process.env.VOICESTUDIO_URL ?? 'http://127.0.0.1:3900';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/voicestudio': {
        target: voiceStudioTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/voicestudio/, ''),
      },
    },
  },
});
