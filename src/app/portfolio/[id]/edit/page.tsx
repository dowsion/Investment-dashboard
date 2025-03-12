"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthCheck from '@/components/AuthCheck';
import { DocumentIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';

export default function EditPortfolioPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
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
    bookValue: '',
    moic: '',
  });

  const [calculatedBookValue, setCalculatedBookValue] = useState<string | null>(null);
  const [calculatedMoic, setCalculatedMoic] = useState<string | null>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [documentTitles, setDocumentTitles] = useState<string[]>([]);
  const [documentTypes, setDocumentTypes] = useState<string[]>([]);

  // Fetch project data
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const response = await fetch(`/api/projects/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio');
        }
        
        const portfolio = await response.json();
        
        // Format date for input field (YYYY-MM-DD)
        const formattedDate = new Date(portfolio.investmentDate)
          .toISOString()
          .split('T')[0];
        
        setFormData({
          name: portfolio.name,
          briefIntro: portfolio.briefIntro || '',
          portfolioStatus: portfolio.portfolioStatus || '',
          investmentDate: formattedDate,
          capitalInvested: portfolio.capitalInvested.toString(),
          initialShareholdingRatio: portfolio.initialShareholdingRatio?.toString() || '',
          currentShareholdingRatio: portfolio.currentShareholdingRatio?.toString() || '',
          investmentCost: portfolio.investmentCost?.toString() || '',
          latestFinancingValuation: portfolio.latestFinancingValuation?.toString() || '',
          bookValue: portfolio.bookValue?.toString() || '',
          moic: portfolio.moic?.toString() || '',
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching portfolio:', error);
        alert('Failed to load portfolio. Redirecting to portfolio page.');
        router.push('/portfolio');
      }
    };
    
    fetchPortfolio();
  }, [id, router]);

  // Calculate Book Value and MOIC
  useEffect(() => {
    const updateCalculatedValues = () => {
      try {
        const latestValuation = formData.latestFinancingValuation ? parseFloat(formData.latestFinancingValuation) : 0;
        const currentShareholding = formData.currentShareholdingRatio ? parseFloat(formData.currentShareholdingRatio) / 100 : 0;
        const actualInvestmentAmount = formData.investmentCost ? parseFloat(formData.investmentCost) : 0;
        
        // Calculate book value
        if (latestValuation > 0 && currentShareholding > 0) {
          const bookVal = latestValuation * currentShareholding;
          setCalculatedBookValue(bookVal.toFixed(2));
          setFormData(prev => ({ ...prev, bookValue: bookVal.toString() }));
          
          // Calculate MOIC if we have investment cost
          if (actualInvestmentAmount > 0) {
            const moicVal = bookVal / actualInvestmentAmount;
            setCalculatedMoic(moicVal.toFixed(2));
            setFormData(prev => ({ ...prev, moic: moicVal.toString() }));
          } else {
            setCalculatedMoic(null);
          }
        } else {
          setCalculatedBookValue(null);
          setCalculatedMoic(null);
        }
      } catch (error) {
        console.error("Error in calculation:", error);
      }
    };
    
    if (!isLoading) {
      updateCalculatedValues();
    }
  }, [formData.latestFinancingValuation, formData.currentShareholdingRatio, formData.investmentCost, isLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert string values to appropriate types
      const portfolioData = {
        name: formData.name,
        briefIntro: formData.briefIntro || null,
        portfolioStatus: formData.portfolioStatus || null,
        investmentDate: new Date(formData.investmentDate),
        capitalInvested: parseFloat(formData.capitalInvested),
        initialShareholdingRatio: formData.initialShareholdingRatio ? parseFloat(formData.initialShareholdingRatio) : null,
        currentShareholdingRatio: formData.currentShareholdingRatio ? parseFloat(formData.currentShareholdingRatio) : null,
        investmentCost: formData.investmentCost ? parseFloat(formData.investmentCost) : null,
        latestFinancingValuation: formData.latestFinancingValuation ? parseFloat(formData.latestFinancingValuation) : null,
        bookValue: formData.bookValue ? parseFloat(formData.bookValue) : null,
        moic: formData.moic ? parseFloat(formData.moic) : null,
      };

      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'true',
          'X-Admin-Token': localStorage.getItem('adminAuthenticated') || ''
        },
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        throw new Error('Failed to update portfolio');
      }

      router.push(`/portfolio/${id}`);
      router.refresh();
    } catch (error) {
      console.error('Error updating portfolio:', error);
      alert('Failed to update portfolio. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 单独处理文件上传
  const handleUploadFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (files.length === 0) {
      setUploadError('Please add at least one document to upload');
      return;
    }
    
    setIsUploadingFiles(true);
    setUploadError('');
    
    try {
      // Upload files
      const uploadPromises = files.map(async (file, index) => {
        if (!file) return null;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', id);
        formData.append('name', documentTitles[index] || file.name);
        formData.append('type', documentTypes[index]);
        
        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'X-Admin-Auth': 'true',
            'X-Admin-Token': localStorage.getItem('adminAuthenticated') || ''
          },
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload document: ${file.name}`);
        }
        
        return response.json();
      });
      
      // Wait for all file uploads to complete
      await Promise.all(uploadPromises);
      
      // Success feedback
      setUploadSuccess(true);
      setFiles([]);
      setDocumentTitles([]);
      setDocumentTypes([]);
      
      // Hide success message after a few seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error uploading files:', error);
      setUploadError('Failed to upload one or more documents. Please try again.');
    } finally {
      setIsUploadingFiles(false);
    }
  };

  // Add file handling functions
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (e.target.files && e.target.files[0]) {
      const newFiles = [...files];
      newFiles[index] = e.target.files[0];
      setFiles(newFiles);
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

  const addFileInput = () => {
    setFiles([...files, null as unknown as File]);
    setDocumentTitles([...documentTitles, '']);
    setDocumentTypes([...documentTypes, 'business_plan']);
  };

  const removeFileInput = (index: number) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-800">Loading portfolio data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <AuthCheck />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Edit Portfolio</h1>
        <div className="flex space-x-3">
          <Link 
            href={`/portfolio/${id}`}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
          >
            Cancel
          </Link>
          <Link 
            href="/admin"
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded"
          >
            Back to Admin
          </Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Information</h2>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-6">
            <div className="col-span-2">
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
              />
            </div>

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
              <label className="block text-gray-700 font-bold mb-2" htmlFor="initialShareholdingRatio">
                Initial Shareholding Ratio (%)
              </label>
              <input
                type="number"
                id="initialShareholdingRatio"
                name="initialShareholdingRatio"
                value={formData.initialShareholdingRatio}
                onChange={handleChange}
                min="0"
                max="100"
                step="0.01"
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
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
                required
                min="0"
                step="0.01"
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
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
                min="0"
                max="100"
                step="0.01"
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2" htmlFor="investmentCost">
                Actual Investment Amount ($)
              </label>
              <input
                type="number"
                id="investmentCost"
                name="investmentCost"
                value={formData.investmentCost}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
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
                min="0"
                step="0.01"
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2 flex items-center" htmlFor="bookValue">
                Book Value ($)
                {calculatedBookValue && (
                  <span className="ml-2 text-xs text-green-600 font-medium">
                    (Calculated: ${parseFloat(calculatedBookValue).toLocaleString()})
                  </span>
                )}
              </label>
              <input
                type="number"
                id="bookValue"
                name="bookValue"
                value={formData.bookValue}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700 bg-gray-50"
                readOnly={!!calculatedBookValue}
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-2 flex items-center" htmlFor="moic">
                MOIC
                {calculatedMoic && (
                  <span className="ml-2 text-xs text-green-600 font-medium">
                    (Calculated: {parseFloat(calculatedMoic).toFixed(2)}x)
                  </span>
                )}
              </label>
              <input
                type="number"
                id="moic"
                name="moic"
                value={formData.moic}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700 bg-gray-50"
                readOnly={!!calculatedMoic}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 font-bold mb-2" htmlFor="briefIntro">
                Brief Introduction
              </label>
              <textarea
                id="briefIntro"
                name="briefIntro"
                value={formData.briefIntro}
                onChange={handleChange}
                rows={4}
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-gray-700 font-bold mb-2" htmlFor="portfolioStatus">
                Portfolio Status
              </label>
              <textarea
                id="portfolioStatus"
                name="portfolioStatus"
                value={formData.portfolioStatus}
                onChange={handleChange}
                rows={4}
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
              />
            </div>

            <div className="col-span-2 mt-4">
              <div className="flex justify-end">
                <Link 
                  href={`/portfolio/${id}`}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded mr-4"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-3 px-6 rounded"
                >
                  {isSubmitting ? 'Saving...' : 'Save Portfolio Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* 文件上传区域 - 使用单独的表单 */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Upload</h2>
        
        {/* 上传成功提示 */}
        {uploadSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-6">
            Documents uploaded successfully!
          </div>
        )}
        
        {/* 上传错误提示 */}
        {uploadError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6">
            {uploadError}
          </div>
        )}
        
        <form onSubmit={handleUploadFiles}>
          <div className="mb-4 flex justify-end">
            <button 
              type="button" 
              onClick={addFileInput}
              className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-2 px-4 rounded inline-flex items-center"
            >
              <DocumentPlusIcon className="h-5 w-5 mr-2" />
              Add Document
            </button>
          </div>
          
          {files.length === 0 ? (
            <div className="bg-gray-50 p-6 text-center rounded-lg border border-dashed border-gray-300 mb-6">
              <DocumentIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Click "Add Document" to upload files related to this portfolio</p>
            </div>
          ) : (
            <div className="space-y-6 mb-6">
              {files.map((file, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-medium text-gray-800">Document #{index + 1}</h3>
                    <button 
                      type="button" 
                      onClick={() => removeFileInput(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 font-bold mb-2" htmlFor={`document-title-${index}`}>
                        Document Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id={`document-title-${index}`}
                        value={documentTitles[index] || ''}
                        onChange={(e) => handleDocumentTitleChange(e, index)}
                        required
                        className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                        placeholder="Enter document title"
                      />
                    </div>
                    
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
                        <option value="general">General Disclosure Document</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="xl:col-span-2">
                      <label className="block text-gray-700 font-bold mb-2" htmlFor={`file-${index}`}>
                        File <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        id={`file-${index}`}
                        onChange={(e) => handleFileChange(e, index)}
                        required
                        className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                      />
                      {file && (
                        <p className="mt-1 text-sm text-gray-500">
                          Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {files.length > 0 && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isUploadingFiles}
                className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded"
              >
                {isUploadingFiles ? 'Uploading...' : 'Upload Documents'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 