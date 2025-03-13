"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DocumentIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import AuthCheck from '@/components/AuthCheck';

export default function NewPortfolioPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    briefIntro: '',
    portfolioStatus: '',
    investmentDate: '',
    capitalInvested: '',
    initialShareholdingRatio: '',
    currentShareholdingRatio: '',
    investmentCost: '',
    latestFinancingValuation: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [files, setFiles] = useState<(File | null)[]>([]);
  const [documentTitles, setDocumentTitles] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);
  
  // 使用AuthCheck组件进行身份验证检查

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // 检查文件大小是否超过50MB
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File size exceeds the 50MB limit. Please choose a smaller file.');
        return;
      }
      
      // 更新文件数组
      const newFiles = [...files];
      newFiles[index] = selectedFile;
      
      // 确保documentTitles数组与files数组长度一致
      const newTitles = [...documentTitles];
      while (newTitles.length <= index) {
        newTitles.push('');
      }
      
      // 自动使用文件名作为文档标题
      newTitles[index] = selectedFile.name;
      
      // 确保documentTypes数组与files数组长度一致
      const newTypes = [...documentTypes];
      while (newTypes.length <= index) {
        newTypes.push('business_plan');
      }
      
      // 更新所有状态
      setFiles(newFiles);
      setDocumentTitles(newTitles);
      setDocumentTypes(newTypes);
      
      // 清除错误信息
      setError('');
    }
  };

  const handleDocumentTitleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newTitles = [...documentTitles];
    newTitles[index] = e.target.value;
    setDocumentTitles(newTitles);
  };

  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
    const newTypes = [...documentTypes];
    newTypes[index] = e.target.value;
    setDocumentTypes(newTypes);
  };

  const handleAddDocument = () => {
    // 确保添加新文档时，所有数组都同步添加一个元素
    const newFiles = [...files, null];
    const newTitles = [...documentTitles];
    const newTypes = [...documentTypes];
    
    // 确保标题和类型数组与文件数组长度保持一致
    while (newTitles.length < newFiles.length) {
      newTitles.push('');
    }
    
    while (newTypes.length < newFiles.length) {
      newTypes.push('business_plan');
    }
    
    setFiles(newFiles);
    setDocumentTitles(newTitles);
    setDocumentTypes(newTypes);
  };

  const handleRemoveDocument = (index: number) => {
    const newFiles = [...files];
    const newTitles = [...documentTitles];
    const newTypes = [...documentTypes];
    
    newFiles.splice(index, 1);
    newTitles.splice(index, 1);
    newTypes.splice(index, 1);
    
    setFiles(newFiles);
    setDocumentTitles(newTitles);
    setDocumentTypes(newTypes);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Format the data for API
    const apiData = {
      ...formData,
      capitalInvested: formData.capitalInvested ? parseFloat(formData.capitalInvested) : undefined,
      initialShareholdingRatio: formData.initialShareholdingRatio ? parseFloat(formData.initialShareholdingRatio) : undefined,
      currentShareholdingRatio: formData.currentShareholdingRatio ? parseFloat(formData.currentShareholdingRatio) : undefined,
      investmentCost: formData.investmentCost ? parseFloat(formData.investmentCost) : undefined,
      latestFinancingValuation: formData.latestFinancingValuation ? parseFloat(formData.latestFinancingValuation) : undefined,
    };
    
    try {
      // 1. 首先创建项目
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // 添加管理员令牌到请求头
          'X-Admin-Auth': 'true',
          'X-Admin-Token': localStorage.getItem('adminAuthenticated') || ''
        },
        body: JSON.stringify(apiData),
      });
      
      if (response.ok) {
        const projectData = await response.json();
        
        // 2. 如果有文件，上传文件
        if (files.length > 0) {
          const uploadPromises = files.map(async (file, index) => {
            if (!file) return null;
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('projectId', projectData.id);
            
            // 确保name字段始终有值
            const documentName = documentTitles[index]?.trim() || file.name || `Document ${index + 1}`;
            formData.append('name', documentName);
            
            formData.append('type', documentTypes[index]);
            
            return fetch('/api/documents', {
              method: 'POST',
              body: formData,
            });
          });
          
          // 等待所有文件上传完成
          await Promise.all(uploadPromises);
        }
        
        setSuccess('Portfolio created successfully!');
        setFormData({
          name: '',
          briefIntro: '',
          portfolioStatus: '',
          investmentDate: '',
          capitalInvested: '',
          initialShareholdingRatio: '',
          currentShareholdingRatio: '',
          investmentCost: '',
          latestFinancingValuation: '',
        });
        setFiles([]);
        setDocumentTitles([]);
        setDocumentTypes([]);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/portfolio');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create portfolio');
      }
    } catch (err) {
      setError('An error occurred while creating the portfolio');
      console.error('Error creating portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <AuthCheck />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create New Portfolio</h1>
        <Link 
          href="/admin"
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
        >
          Back to Admin
        </Link>
      </div>
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
          {error}
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Information</h2>
            
            {/* Portfolio Name - Full Width */}
            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2" htmlFor="name">
                Portfolio Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                placeholder="Enter portfolio name"
              />
            </div>
            
            {/* Brief Introduction - Full Width */}
            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2" htmlFor="briefIntro">
                Portfolio Introduction
              </label>
              <textarea
                id="briefIntro"
                name="briefIntro"
                value={formData.briefIntro}
                onChange={handleChange}
                rows={4}
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                placeholder="Enter a brief introduction of the portfolio"
              />
            </div>
            
            {/* Portfolio Status - Full Width */}
            <div className="mb-6">
              <label className="block text-gray-700 font-bold mb-2" htmlFor="portfolioStatus">
                Portfolio Status
              </label>
              <textarea
                id="portfolioStatus"
                name="portfolioStatus"
                value={formData.portfolioStatus}
                onChange={handleChange}
                rows={4}
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                placeholder="Enter current status of the portfolio"
              />
            </div>
            
            {/* Two Column Layout with Reduced Width */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-6">
              {/* Left Column - Investment Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="investmentDate">
                    Investment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    id="investmentDate"
                    name="investmentDate"
                    value={formData.investmentDate}
                    onChange={handleChange}
                    required
                    className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="capitalInvested">
                    Committed Investment Amount ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="capitalInvested"
                    name="capitalInvested"
                    value={formData.capitalInvested}
                    onChange={handleChange}
                    step="0.01"
                    required
                    className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="investmentCost">
                    Actual Investment Amount ($) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    id="investmentCost"
                    name="investmentCost"
                    value={formData.investmentCost}
                    onChange={handleChange}
                    step="0.01"
                    required
                    className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              {/* Right Column - Shareholding Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="initialShareholdingRatio">
                    Initial Shareholding Ratio (%)
                  </label>
                  <input
                    type="number"
                    id="initialShareholdingRatio"
                    name="initialShareholdingRatio"
                    value={formData.initialShareholdingRatio}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="currentShareholdingRatio">
                    Current Shareholding Ratio (%)
                  </label>
                  <input
                    type="number"
                    id="currentShareholdingRatio"
                    name="currentShareholdingRatio"
                    value={formData.currentShareholdingRatio}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    max="100"
                    className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2" htmlFor="latestFinancingValuation">
                    Latest Financing Valuation ($)
                  </label>
                  <input
                    type="number"
                    id="latestFinancingValuation"
                    name="latestFinancingValuation"
                    value={formData.latestFinancingValuation}
                    onChange={handleChange}
                    step="0.01"
                    className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Document Upload Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Document Upload</h2>
              <button 
                type="button" 
                onClick={handleAddDocument}
                className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-3 px-6 rounded inline-flex items-center"
              >
                <DocumentPlusIcon className="h-5 w-5 mr-2" />
                Add Document
              </button>
            </div>
            
            {files.length === 0 ? (
              <div className="bg-gray-50 p-6 text-center rounded-lg border border-dashed border-gray-300">
                <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">Click "Add Document" to upload files related to this portfolio</p>
              </div>
            ) : (
              <div className="space-y-6">
                {files.map((file, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-medium text-gray-800">Document #{index + 1}</h3>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveDocument(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 xl:grid-cols-1 gap-4">
                      <div>
                        <label className="block text-gray-700 font-bold mb-2" htmlFor={`document-type-${index}`}>
                          Document Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          id={`document-type-${index}`}
                          value={documentTypes[index] || 'business_plan'}
                          onChange={(e) => handleDocumentTypeChange(e, index)}
                          required
                          className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                        >
                          <option value="business_plan">Business Plan</option>
                          <option value="investment_committee">Investment Committee Records</option>
                          <option value="due_diligence">Due Diligence Report</option>
                          <option value="contract">Investment Agreement</option>
                          <option value="payment_proof">Proof of Payment</option>
                          <option value="receipt">Payment Receipt</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-gray-700 font-bold mb-2" htmlFor={`file-${index}`}>
                          File <span className="text-red-500">*</span>
                          <span className="ml-2 text-xs text-gray-500 font-normal">(Max file size: 50MB)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="file"
                            id={`file-${index}`}
                            onChange={(e) => handleFileChange(e, index)}
                            required
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <div className={`flex items-center justify-between shadow-sm border ${file ? 'border-blue-300 bg-blue-50' : 'border-gray-300'} rounded-md p-3`}>
                            <span className="text-gray-700 truncate">
                              {file ? file.name : 'Click to select a file...'}
                            </span>
                            <span className="text-blue-500 text-sm font-medium">
                              Browse
                            </span>
                          </div>
                        </div>
                        {file && (
                          <p className="mt-1 text-sm text-gray-500">
                            File size: {(file.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <Link 
              href="/admin"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded mr-4"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-3 px-6 rounded"
            >
              {loading ? 'Creating...' : 'Create Portfolio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 