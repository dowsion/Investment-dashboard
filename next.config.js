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
};

module.exports = nextConfig; 