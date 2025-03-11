import { getProjects } from '@/lib/data';
import { DollarSignIcon, TrendingUpIcon, LayersIcon, PieChartIcon } from 'lucide-react';
import ProjectList from '@/components/ProjectList';
import prisma from '@/lib/prisma';

// 禁用页面缓存，确保每次访问都获取最新数据
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PortfolioPage() {
  // Get all projects for the portfolio page
  const projects = await getProjects();
  
  // Calculate portfolio statistics
  const portfolioStats = await prisma.project.aggregate({
    _sum: {
      capitalInvested: true,
      investmentCost: true,
      bookValue: true,
    },
    _count: {
      id: true,
    },
  });

  // Extract values or default to 0 if null
  const totalInvested = portfolioStats._sum.capitalInvested || portfolioStats._sum.investmentCost || 0;
  const totalBookValue = portfolioStats._sum.bookValue || 0;
  const projectCount = portfolioStats._count.id || 0;

  // Calculate overall MOIC if total invested > 0
  const overallMoic = totalInvested > 0 ? totalBookValue / totalInvested : 0;

  return (
    <div>
      {/* 页面标题 */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Portfolio Overview</h2>
      
      {/* Portfolio Summary - 改为响应式Grid布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Project Count Stat Card */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-amber-100 p-2 rounded-full mr-3">
              <PieChartIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Portfolios</p>
              <p className="text-lg font-semibold">{projectCount}</p>
            </div>
          </div>
        </div>
        
        {/* Total Invested Stat Card */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <DollarSignIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Invested</p>
              <p className="text-lg font-semibold">${totalInvested.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Total Book Value Stat Card */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <LayersIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Book Value</p>
              <p className="text-lg font-semibold">${totalBookValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Overall MOIC Stat Card */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Overall MOIC</p>
              <p className="text-lg font-semibold">{overallMoic.toFixed(2)}x</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 项目列表区域 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-800">All Portfolios</h3>
        </div>
        <div>
          <ProjectList 
            projects={projects} 
            variant="portfolio" 
          />
        </div>
      </div>
    </div>
  );
} 