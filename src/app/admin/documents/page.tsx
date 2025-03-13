"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DocumentTextIcon, EyeIcon, EyeSlashIcon, ArrowDownTrayIcon, PlusCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import AuthCheck from '@/components/AuthCheck';

// 定义文档类型
interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  createdAt: string;
  projectId: string;
  project?: {
    name: string;
  };
  isVisible?: boolean;
}

export default function AdminDocuments() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    fetchDocuments();
  }, []);
  
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        setError('Failed to load documents');
      }
    } catch (err) {
      setError('An error occurred while loading documents');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleVisibility = async (id: string, currentVisibility: boolean) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          isVisible: !currentVisibility,
        }),
      });
      
      if (response.ok) {
        // 更新本地状态以反映变化
        setDocuments(prevDocs => 
          prevDocs.map(doc => 
            doc.id === id ? { ...doc, isVisible: !currentVisibility } : doc
          )
        );
      } else {
        alert('Failed to update document visibility.');
      }
    } catch (err) {
      console.error('Error updating document visibility:', err);
      alert('An error occurred while updating the document.');
    }
  };
  
  const deleteDocument = async (id: string, name: string) => {
    // 确认删除
    if (!confirm(`确定要删除文档 "${name}" 吗？此操作不可撤销。`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/documents?id=${id}`, {
        method: 'DELETE',
        headers: {
          'X-Admin-Auth': 'true',
          'X-Admin-Token': localStorage.getItem('adminAuthenticated') || ''
        }
      });
      
      if (response.ok) {
        // 从本地状态中移除文档
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== id));
        alert('文档已成功删除');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除文档失败');
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('删除文档时发生错误');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // 根据文档URL获取可靠的访问URL
  const getDocumentUrl = (originalUrl: string) => {
    // 如果URL以/uploads/开头，转换为API路由
    if (originalUrl.startsWith('/uploads/')) {
      const filename = originalUrl.replace('/uploads/', '');
      return `/api/files/${filename}`;
    }
    return originalUrl;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <AuthCheck />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4 md:mb-0">Document Management</h1>
        <div className="flex space-x-3">
          <Link 
            href="/documents/upload"
            className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-2 px-4 rounded inline-flex items-center"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Upload New Document
          </Link>
          <Link 
            href="/admin"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
          >
            Back to Admin
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="bg-white p-6 rounded-lg shadow text-center py-10">
          <p className="text-gray-500">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg mb-2">No documents available</p>
          <p className="text-gray-400 text-sm mb-6">Upload a document to get started</p>
          <Link 
            href="/documents/upload" 
            className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-2 px-4 rounded inline-flex items-center"
          >
            <PlusCircleIcon className="h-5 w-5 mr-2" />
            Upload Document
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Related Project
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Upload Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visibility
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-5 w-5 text-[#3a67c4] mr-3 flex-shrink-0" />
                        <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {doc.project?.name || 'General'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(doc.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {doc.type ? doc.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button 
                        onClick={() => toggleVisibility(doc.id, !!doc.isVisible)}
                        className={`inline-flex items-center justify-center px-4 py-1.5 border border-transparent text-xs font-medium rounded min-w-[90px] 
                          ${doc.isVisible 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      >
                        {doc.isVisible ? (
                          <>
                            <EyeIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeSlashIcon className="h-4 w-4 mr-1.5 flex-shrink-0" />
                            <span className="whitespace-nowrap">Hidden</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-6">
                        {doc.url && (
                          <>
                            <Link 
                              href={getDocumentUrl(doc.url)} 
                              className="text-[#3a67c4] hover:text-[#5e82d2] inline-flex items-center"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Link>
                            <Link 
                              href={getDocumentUrl(doc.url)} 
                              className="text-[#3a67c4] hover:text-[#5e82d2] inline-flex items-center"
                              download={doc.name || true}
                            >
                              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Download</span>
                            </Link>
                            <button
                              onClick={() => deleteDocument(doc.id, doc.name)}
                              disabled={isDeleting}
                              className="text-red-600 hover:text-red-800 inline-flex items-center"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 