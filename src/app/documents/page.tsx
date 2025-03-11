"use client";

import { useState, useEffect } from 'react';
import { PrismaClient, Document, Project } from '@prisma/client';
import Link from 'next/link';
import { DocumentIcon, DocumentTextIcon, ArrowDownTrayIcon, EyeIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const prisma = new PrismaClient();

// 定义带有project的Document类型
type DocumentWithProject = Document & {
  project: Pick<Project, 'name'> | null;
};

type SortField = 'name' | 'createdAt';
type SortDirection = 'asc' | 'desc';

async function getAllDocuments(): Promise<DocumentWithProject[]> {
  try {
    const documents = await prisma.document.findMany({
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
      // 暂时移除isVisible筛选，等Prisma客户端更新后再添加
      // where: {
      //   isVisible: true,
      // },
    });
    return documents as DocumentWithProject[];
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('/api/documents');
        if (response.ok) {
          const data = await response.json();
          setDocuments(data);
        } else {
          console.error('Failed to fetch documents');
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (field !== sortField) return null;
    
    return sortDirection === 'asc' 
      ? <ArrowUpIcon className="w-4 h-4 ml-1 inline-block" /> 
      : <ArrowDownIcon className="w-4 h-4 ml-1 inline-block" />;
  };

  const sortedDocuments = [...documents].sort((a, b) => {
    if (sortField === 'name') {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      return sortDirection === 'asc' 
        ? nameA.localeCompare(nameB) 
        : nameB.localeCompare(nameA);
    } else {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-full xl:max-w-[1400px] 2xl:max-w-[1600px]">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Documents</h1>
        <p className="text-gray-500 mt-2">Access and download investment-related documentation</p>
      </div>
      
      {loading ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-500">Loading documents...</p>
        </div>
      ) : !documents || documents.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg mb-2">No documents available</p>
          <p className="text-gray-400 text-sm">Documents will appear here when they become available</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Document Name
                      {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Related Portfolio
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Upload Date & Time
                      {renderSortIndicator('createdAt')}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentIcon className="h-5 w-5 text-[#3a67c4] mr-3 flex-shrink-0" />
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
                        {formatDateTime(doc.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {doc.type ? doc.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Document'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {doc.url && (
                        <div className="flex justify-end space-x-2">
                          <Link 
                            href={doc.url} 
                            className="text-[#3a67c4] hover:text-[#5e82d2] inline-flex items-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            <span>View</span>
                          </Link>
                          <Link 
                            href={doc.url} 
                            className="text-[#3a67c4] hover:text-[#5e82d2] inline-flex items-center"
                            download
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            <span>Download</span>
                          </Link>
                        </div>
                      )}
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