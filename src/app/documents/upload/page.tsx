"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthCheck from '@/components/AuthCheck';

export default function UploadDocumentPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documentType, setDocumentType] = useState('');
  
  // Fetch projects for dropdown
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      } else {
        setError('Failed to load projects');
      }
    } catch (err) {
      setError('An error occurred while loading projects');
      console.error('Error loading projects:', err);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDocumentTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setDocumentType(newType);
    
    // 如果文档类型为general，则不要求projectId
    if (newType === 'general') {
      // 不做任何验证
    } else if (!projectId) {
      // 对于其他类型，如果没有选择项目，提示用户
      console.log('Non-general documents require a portfolio selection');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 基本验证
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    // 对于非general类型文档，验证是否选择了项目
    if (documentType !== 'general' && !projectId) {
      setError('Please select an associated portfolio for this document type');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    // 对于general类型文档，不需要projectId
    if (documentType !== 'general' && projectId) {
      formData.append('projectId', projectId);
    }
    
    // 使用title作为name参数
    formData.append('name', title);
    formData.append('type', documentType);
    
    if (description) {
      formData.append('description', description);
    }
    
    try {
      console.log("Submitting document with type:", documentType, "projectId:", projectId || "none");
      
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          // 添加管理员认证头部
          'X-Admin-Auth': 'true',
          'X-Admin-Token': localStorage.getItem('adminAuthenticated') || ''
        },
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log("Document uploaded successfully:", result);
        
        setSuccess('Document uploaded successfully!');
        // Reset form
        setFile(null);
        setTitle('');
        setDescription('');
        setProjectId('');
        setDocumentType('');
        
        // Redirect after success
        setTimeout(() => {
          router.push('/documents');
        }, 2000);
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorData = { error: `Server error (${response.status})` };
        }
        
        console.error("Document upload failed:", errorData, "Status:", response.status);
        setError(errorData.error || `Failed to upload document (Status: ${response.status})`);
      }
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(`An error occurred while uploading the document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <AuthCheck />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Upload Document</h1>
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
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-gray-700 font-bold mb-2" htmlFor="projectId">
                Associated Portfolio {documentType !== 'general' && <span className="text-red-500">*</span>}
                {documentType === 'general' && <span className="ml-2 text-xs text-gray-500 font-normal">(Optional for General Documents)</span>}
              </label>
              <select
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                disabled={projectsLoading}
                required={documentType !== 'general'}
              >
                <option value="">Select a portfolio</option>
                {projects.map((project: any) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 font-bold mb-2" htmlFor="title">
                Document Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                placeholder="Enter document title"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-bold mb-2" htmlFor="type">
                Document Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                value={documentType}
                onChange={handleDocumentTypeChange}
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                required
              >
                <option value="">Select document type</option>
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
            
            <div>
              <label className="block text-gray-700 font-bold mb-2" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="shadow-sm border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                placeholder="Enter document description"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-bold mb-2" htmlFor="file">
                Document File <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-gray-500 font-normal">(Max file size: 50MB)</span>
              </label>
              <input
                type="file"
                id="file"
                onChange={handleFileChange}
                className="shadow-sm border-2 border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md w-full p-3 text-gray-700"
                required
              />
              {file && (
                <p className="mt-1 text-sm text-gray-500">
                  Selected file: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            
            <div className="flex justify-end mt-4">
              <Link 
                href="/admin"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-6 rounded mr-4"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !file}
                className="bg-[#3a67c4] hover:bg-[#5e82d2] text-white font-medium py-3 px-6 rounded"
              >
                {loading ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 