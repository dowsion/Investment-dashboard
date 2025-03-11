"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentIcon, FolderPlusIcon, DocumentPlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Project } from '@prisma/client';

// 设置登录会话超时时间（毫秒）
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState('');
  
  // 检查身份验证状态和会话超时
  useEffect(() => {
    const checkAuth = () => {
      // 从localStorage获取身份验证状态
      const storedAuth = localStorage.getItem('adminAuthenticated');
      // 从sessionStorage获取时间戳
      const authTimestamp = sessionStorage.getItem('adminAuthTimestamp');
      
      // 检查是否已验证身份以及会话是否超时
      if (storedAuth === 'true' && authTimestamp) {
        const currentTime = Date.now();
        const authTime = parseInt(authTimestamp);
        
        // 如果会话未超时，则设置为已验证
        if (currentTime - authTime < SESSION_TIMEOUT) {
          setIsAuthenticated(true);
          fetchProjects();
          
          // 更新时间戳以延长会话
          sessionStorage.setItem('adminAuthTimestamp', currentTime.toString());
        } else {
          // 会话已超时，清除身份验证状态
          handleLogout();
          setError('Your session has expired. Please login again.');
        }
      }
    };
    
    // 初始检查
    checkAuth();
    
    // 设置定期检查身份验证状态的定时器
    const intervalId = setInterval(checkAuth, 60000); // 每分钟检查一次
    
    // 清理函数
    return () => clearInterval(intervalId);
  }, []);
  
  // 登出处理函数
  const handleLogout = () => {
    localStorage.removeItem('adminAuthenticated');
    sessionStorage.removeItem('adminAuthTimestamp');
    setIsAuthenticated(false);
  };
  
  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove the deleted project from the state
        setProjects(projects.filter(project => project.id !== id));
        setDeleteSuccess('Project successfully deleted.');
        setTimeout(() => setDeleteSuccess(''), 3000);
      } else {
        alert('Failed to delete project. Please try again.');
      }
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('An error occurred while deleting the project.');
    }
  };
  
  const authenticate = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple authentication for demo purposes
    if (username === 'admin' && password === 'admin123') {
      // 设置身份验证状态
      setIsAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      // 设置身份验证时间戳
      sessionStorage.setItem('adminAuthTimestamp', Date.now().toString());
      fetchProjects();
    } else {
      setError('Invalid username or password');
    }
  };
  
  const navigateToProtectedRoute = (route: string) => {
    // 更新时间戳以延长会话
    sessionStorage.setItem('adminAuthTimestamp', Date.now().toString());
    router.push(route);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={authenticate} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-gray-700 font-medium mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-2 px-4 rounded"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-0 text-gray-800">Admin Dashboard</h1>
        <div className="flex space-x-3">
          <button 
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded"
          >
            Logout
          </button>
          <Link 
            href="/"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
          >
            Return to Main Site
          </Link>
        </div>
      </div>
      
      {deleteSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          {deleteSuccess}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Management</h2>
          <p className="text-gray-600 mb-4">
            Create new portfolios or manage existing investment portfolios.
          </p>
          <button
            onClick={() => navigateToProtectedRoute('/portfolio/new')}
            className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-2 px-4 rounded"
          >
            Create New Portfolio
          </button>
          
          {projects.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Existing Portfolios</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="py-2 px-4 text-left">Portfolio Name</th>
                      <th className="py-2 px-4 text-left">Investment Date</th>
                      <th className="py-2 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-b border-gray-200">
                        <td className="py-2 px-4">{project.name}</td>
                        <td className="py-2 px-4">
                          {project.investmentDate 
                            ? new Date(project.investmentDate).toLocaleDateString() 
                            : 'N/A'}
                        </td>
                        <td className="py-2 px-4">
                          <button
                            onClick={() => navigateToProtectedRoute(`/portfolio/${project.id}/edit`)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {loading && <p className="mt-4 text-gray-600">Loading projects...</p>}
          
          {!loading && projects.length === 0 && (
            <p className="mt-4 text-gray-600">No projects found. Create a new project to get started.</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Management</h2>
          <p className="text-gray-600 mb-4">
            Upload and manage documents related to investment projects.
          </p>
          <button
            onClick={() => navigateToProtectedRoute('/documents/upload')}
            className="block w-full bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-3 px-4 rounded text-center"
          >
            Upload New Document
          </button>
          <button
            onClick={() => navigateToProtectedRoute('/admin/documents')}
            className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded text-center"
          >
            Manage Documents
          </button>
        </div>
      </div>
    </div>
  );
} 