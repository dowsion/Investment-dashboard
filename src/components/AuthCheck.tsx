"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 设置登录会话超时时间（毫秒）
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟

export default function AuthCheck() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      // 从localStorage获取身份验证状态
      const storedAuth = localStorage.getItem('adminAuthenticated');
      // 从sessionStorage获取时间戳
      const authTimestamp = sessionStorage.getItem('adminAuthTimestamp');
      
      // 检查是否已验证身份以及会话是否超时
      if (storedAuth !== 'true' || !authTimestamp) {
        // 未登录，重定向到登录页面
        router.push('/admin');
        return;
      }
      
      // 检查会话是否超时
      const currentTime = Date.now();
      const authTime = parseInt(authTimestamp);
      
      if (currentTime - authTime > SESSION_TIMEOUT) {
        // 会话已超时，清除身份验证状态并重定向到登录页面
        localStorage.removeItem('adminAuthenticated');
        sessionStorage.removeItem('adminAuthTimestamp');
        router.push('/admin');
      } else {
        // 更新时间戳以延长会话
        sessionStorage.setItem('adminAuthTimestamp', currentTime.toString());
      }
    };
    
    // 初始检查
    checkAuth();
    
    // 设置定期检查身份验证状态的定时器
    const intervalId = setInterval(checkAuth, 60000); // 每分钟检查一次
    
    // 清理函数
    return () => clearInterval(intervalId);
  }, [router]);

  // 这个组件不渲染任何内容，只执行身份验证检查
  return null;
} 