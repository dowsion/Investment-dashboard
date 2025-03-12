'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminAuthContextType {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

interface AdminAuthProviderProps {
  children: ReactNode;
}

export function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // 检查浏览器环境以及登录状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authStatus = localStorage.getItem('adminAuthenticated');
      setIsAuthenticated(authStatus === 'true');
    }
  }, []);

  const login = async (password: string): Promise<boolean> => {
    // 验证管理员密码
    if (
      typeof window !== 'undefined' && 
      password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    ) {
      localStorage.setItem('adminAuthenticated', 'true');
      localStorage.setItem('adminToken', process.env.NEXT_PUBLIC_ADMIN_TOKEN || '');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('adminAuthenticated');
      localStorage.removeItem('adminToken');
      setIsAuthenticated(false);
    }
  };

  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window !== 'undefined') {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        return {
          'X-Admin-Auth': 'true',
          'X-Admin-Token': adminToken,
        };
      }
    }
    return {};
  };

  const value: AdminAuthContextType = {
    isAuthenticated,
    login,
    logout,
    getAuthHeaders,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export default AdminAuthContext; 