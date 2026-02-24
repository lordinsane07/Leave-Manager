import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'https://leave-manager-74g2.onrender.com', // Updated to live Render backend
                changeOrigin: true,
                secure: false, // Set to true if HTTPS is fully verified, sometimes Render takes a moment
            },
        },
    },
});
