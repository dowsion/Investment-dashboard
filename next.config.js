/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 禁用实验性功能，避免Webpack和Turbopack冲突
  experimental: {
    // 确保使用标准的Webpack流程
    webpackBuildWorker: false
  },
  // 配置输出目录作为静态导出
  output: 'standalone',
  // 配置静态文件处理
  images: {
    unoptimized: true,
  },
  // 确保特定路径能够被访问
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 