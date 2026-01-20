/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除 standalone 模式，使用默认输出（Cloudflare Pages 支持）
  // output: 'standalone', // 注释掉，因为 standalone 会包含缓存文件
  // 禁用 webpack 缓存以解决 Cloudflare Pages 文件大小限制
  webpack: (config, { dev, isServer }) => {
    // 完全禁用缓存以避免生成大型缓存文件
    config.cache = false;
    return config;
  },
  // 实验性功能：改进的 Fast Refresh
  experimental: {
    // 优化 HMR
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
