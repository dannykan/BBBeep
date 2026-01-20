/** @type {import('next').NextConfig} */
const nextConfig = {
  // 不使用静态导出，使用 Cloudflare Pages 的 Next.js 运行时支持
  // Cloudflare Pages 现在支持 Next.js SSR
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

module.exports = nextConfig;
