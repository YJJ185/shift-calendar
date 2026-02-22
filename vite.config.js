import { defineConfig } from 'vite';

export default defineConfig({
    // GitHub Pages 部署在 /shift-calendar/ 子路径下
    base: '/shift-calendar/',
    build: {
        outDir: 'dist',
        // 资源文件放到 assets 目录
        assetsDir: 'assets',
        // 生成 source map 便于调试
        sourcemap: false,
    },
    server: {
        port: 3000,
        open: true
    }
});
