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
  // 配置静态文件处理
  images: {
    unoptimized: true,
  },
  // 增加API路由的请求体大小限制为50MB
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
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
  // 根据环境变量判断是否使用standalone输出
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' } : {}),
};

module.exports = nextConfig; 