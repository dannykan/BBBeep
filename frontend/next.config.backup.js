/** @type {import('next').NextConfig} */
// 备用配置：如果 Cloudflare Pages 不支持 Next.js SSR，使用此配置
const nextConfig = {
  // 使用静态导出
  output: 'export',
  // 禁用图片优化（静态导出不支持）
  images: {
    unoptimized: true,
  },
  // 禁用 webpack 缓存以解决 Cloudflare Pages 文件大小限制
  webpack: (config, { dev, isServer }) => {
    if (!dev) {
      config.cache = false;
    } else {
      config.cache = {
        type: 'memory',
      };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
