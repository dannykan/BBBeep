const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用 Edge Runtime 模式以兼容 Cloudflare Pages
  // 不再使用静态导出，因为动态路由无法预知所有参数
  // output: 'export', // 已移除静态导出，改用 @cloudflare/next-on-pages
  // 禁用图片优化（Cloudflare Pages 支持）
  images: {
    unoptimized: true,
  },
  // 禁用 webpack 缓存以解决 Cloudflare Pages 文件大小限制
  webpack: (config, { dev, isServer }) => {
    // 完全禁用缓存以避免生成大型缓存文件
    if (!dev) {
      config.cache = false;
    } else {
      // 开发环境使用内存缓存
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
  // 实验性功能：改进的 Fast Refresh
  experimental: {
    // 优化 HMR
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = withNextIntl(nextConfig);
