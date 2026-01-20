/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // 禁用 webpack 缓存以解决开发环境缓存问题
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      // 在开发环境中禁用某些缓存策略
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        // 减少缓存问题
        compression: false,
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
