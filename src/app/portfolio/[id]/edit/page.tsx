"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AuthCheck from '@/components/AuthCheck';

export default function EditPortfolioPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    briefIntro: '',
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

      <div className="bg-white p-6 rounded-lg shadow-md overflow-hidden">
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
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 