/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  future: {
    enableLegacyColors: true,
  },
  safelist: [
    'bg-blue-900',
    'bg-blue-950',
    'bg-blue-800',
    'text-blue-100',
    'text-blue-200',
    'text-blue-400',
    'text-blue-500',
    'border-blue-500',
    'border-blue-950',
    'bg-slate-50',
    'text-navy-700',
    'bg-navy-900',
    'bg-navy-800',
    'bg-white',
    'text-cyan-400',
    'text-gray-400',
    'text-gray-500',
    'text-gray-600',
    'text-gray-800',
    'text-gray-900',
    'border-gray-100',
    'border-gray-200',
    'bg-gray-50',
    'text-white',
    'hover:text-white',
    'border-[#3a67c4]',
    'text-[#3a67c4]',
    'bg-[#3a67c4]',
    'hover:bg-[#5e82d2]',
    'bg-[#162a56]',
    'hover:bg-[#162a56]',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      colors: {
        navy: {
          900: '#051029', // 极深海军蓝 - 主背景，调整为更接近图片
          800: '#0a1a3a', // 深海军蓝 - 导航背景
          700: '#162a56', // 海军蓝 - 强调元素
          600: '#1e3a76', // 中等海军蓝
        },
        cyan: {
          400: '#38b2c8', // 亮蓝绿色 - 用于副标题
        },
        dashboard: {
          blue: '#3a67c4',     // 图表和数值使用的蓝色
          lightblue: '#5e82d2', // 更亮的蓝色
          areablue: '#4b7bd3',  // 图表区域填充色
          navy: '#051029',      // 极深海军蓝背景
          border: '#e8edf5',    // 表格边框色
          gray: '#f7f9fc',      // 浅灰背景色
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Lexend', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'dashboard-value': ['2.75rem', { lineHeight: '1.15', fontWeight: '600', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        'dashboard-card': '0 2px 8px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
} 