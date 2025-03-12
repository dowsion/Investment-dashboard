import { getProjects } from '@/lib/data';
import prisma from '@/lib/prisma';
import { DollarSignIcon, TrendingUpIcon, LayersIcon } from 'lucide-react';
import ProjectList from '@/components/ProjectList';

// 禁用页面缓存，确保每次访问都获取最新数据
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dashboard() {
  // Get the top 5 recent portfolios for the dashboard
  const recentProjects = await getProjects(5);
  
  // Calculate aggregated investment statistics
  const aggregatedStats = await prisma.project.aggregate({
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
  const totalInvested = aggregatedStats._sum.capitalInvested || aggregatedStats._sum.investmentCost || 0;
  const totalBookValue = aggregatedStats._sum.bookValue || 0;
  const projectCount = aggregatedStats._count.id || 0;

  // Calculate overall MOIC if total invested > 0
  const overallMoic = totalInvested > 0 ? totalBookValue / totalInvested : 0;

  return (
    <main className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Investment Overview</h1>
      
      {/* 统计卡片区域 - 改为响应式Grid布局 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* 投资总额卡片 */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-blue-100 p-2 rounded-full mr-3">
              <DollarSignIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Investment Amount</p>
              <p className="text-lg font-semibold">${totalInvested.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* 账面价值卡片 */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-green-100 p-2 rounded-full mr-3">
              <LayersIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Fund Book Value</p>
              <p className="text-lg font-semibold">${totalBookValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* MOIC卡片 */}
        <div className="p-4 border border-gray-200 rounded-lg shadow-sm bg-white">
          <div className="flex items-center">
            <div className="bg-purple-100 p-2 rounded-full mr-3">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">MOIC</p>
              <p className="text-lg font-semibold">{overallMoic.toFixed(2)}x</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* 投资组合列表区域 */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-medium text-gray-900">Recent Portfolios</h2>
        </div>
        <ProjectList 
          projects={recentProjects} 
          enableSorting={false} 
          variant="dashboard" 
        />
      </div>
    </main>
  );
}
