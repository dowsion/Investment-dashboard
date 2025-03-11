"use client";

import { Project } from '@prisma/client';
import Link from 'next/link';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

interface ProjectListProps {
  projects: Project[];
  enableSorting?: boolean;
  variant?: 'dashboard' | 'portfolio';
}

type SortField = 'name' | 'investmentDate' | 'capitalInvested' | 'bookValue' | 'moic' | 'initialShareholdingRatio' | 'currentShareholdingRatio' | 'actualInvestmentAmount' | 'latestFinancingValuation' | 'committedInvestmentAmount' | 'briefIntro';
type SortDirection = 'asc' | 'desc';

const ProjectList = ({ projects, enableSorting = true, variant = 'portfolio' }: ProjectListProps) => {
  // 使用 useState 初始化状态，但不立即使用它们来排序
  const [sortField, setSortField] = useState<SortField>('investmentDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  // 添加客户端渲染标记，避免水合不匹配
  const [isClient, setIsClient] = useState(false);
  // 存储经过排序的项目
  const [sortedProjects, setSortedProjects] = useState<Project[]>(projects);

  // 使用 useEffect 确保所有与客户端相关的操作只在客户端执行
  useEffect(() => {
    setIsClient(true);
    // 确保每次接收新的projects数据时都重新排序
    if (projects && projects.length > 0) {
      setSortedProjects(sortProjectsFunc(projects));
    }
  }, [projects]); // 添加projects作为依赖项，确保数据更新时重新渲染

  // 当排序字段或方向改变时，重新排序
  useEffect(() => {
    if (isClient && projects && projects.length > 0) {
      setSortedProjects(sortProjectsFunc(projects));
    }
  }, [sortField, sortDirection, isClient]);

  // Function to format percentage values
  const formatPercentage = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  // Function to format currency values
  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  };

  // Function to calculate Book Value based on the formula: Latest Financing Valuation * Current Shareholding Ratio
  const calculateBookValue = (project: Project): number | null => {
    if (project.latestFinancingValuation && project.currentShareholdingRatio) {
      return project.latestFinancingValuation * (project.currentShareholdingRatio / 100);
    }
    return project.bookValue || null;
  };

  // Function to calculate MOIC based on the formula: Book Value / Investment Cost
  const calculateMoic = (project: Project, bookValue: number | null): number | null => {
    const actualInvestmentAmount = project.investmentCost || project.capitalInvested;
    if (bookValue && actualInvestmentAmount && actualInvestmentAmount > 0) {
      return bookValue / actualInvestmentAmount;
    }
    return project.moic || null;
  };

  // Function to handle sorting
  const handleSort = (field: SortField) => {
    if (!enableSorting || !isClient) return;
    
    if (field === sortField) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Function to render sort indicators
  const renderSortIndicator = (field: SortField) => {
    if (!enableSorting || field !== sortField || !isClient) return null;
    
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="w-4 h-4 ml-1.5 inline-block align-middle" /> 
      : <ChevronDownIcon className="w-4 h-4 ml-1.5 inline-block align-middle" />;
  };

  // Function to sort projects
  const sortProjectsFunc = (projectsToSort: Project[]) => {
    if (!enableSorting) return projectsToSort;
    
    return [...projectsToSort].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;
      
      // Extract values based on sort field
      switch (sortField) {
        case 'name':
          valA = a.name ?? '';
          valB = b.name ?? '';
          break;
        case 'briefIntro':
          valA = (a.briefIntro || '').toLowerCase();
          valB = (b.briefIntro || '').toLowerCase();
          break;
        case 'investmentDate':
          valA = a.investmentDate ? new Date(a.investmentDate).getTime() : 0;
          valB = b.investmentDate ? new Date(b.investmentDate).getTime() : 0;
          break;
        case 'capitalInvested':
          valA = a.capitalInvested ?? 0;
          valB = b.capitalInvested ?? 0;
          break;
        case 'committedInvestmentAmount':
          valA = a.capitalInvested ?? 0;
          valB = b.capitalInvested ?? 0;
          break;
        case 'initialShareholdingRatio':
          valA = a.initialShareholdingRatio ?? 0;
          valB = b.initialShareholdingRatio ?? 0;
          break;
        case 'currentShareholdingRatio':
          valA = a.currentShareholdingRatio ?? 0;
          valB = b.currentShareholdingRatio ?? 0;
          break;
        case 'actualInvestmentAmount':
          valA = a.investmentCost ?? 0;
          valB = b.investmentCost ?? 0;
          break;
        case 'latestFinancingValuation':
          valA = a.latestFinancingValuation ?? 0;
          valB = b.latestFinancingValuation ?? 0;
          break;
        case 'bookValue':
          valA = calculateBookValue(a) ?? 0;
          valB = calculateBookValue(b) ?? 0;
          break;
        case 'moic':
          valA = calculateMoic(a, calculateBookValue(a)) ?? 0;
          valB = calculateMoic(b, calculateBookValue(b)) ?? 0;
          break;
        default:
          valA = 0;
          valB = 0;
      }
      
      // 修复类型问题的排序逻辑
      if (sortDirection === 'asc') {
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valA.localeCompare(valB);
        } else {
          return Number(valA) - Number(valB);
        }
      } else {
        if (typeof valA === 'string' && typeof valB === 'string') {
          return valB.localeCompare(valA);
        } else {
          return Number(valB) - Number(valA);
        }
      }
    });
  };

  // Format date in YYYY/MM/DD format
  const formatDate = (date: Date | string): string => {
    return format(new Date(date), 'yyyy/MM/dd');
  };

  const getThClassName = (field: SortField) => {
    let classes = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer";
    if (enableSorting && field === sortField && isClient) {
      classes += " bg-gray-100";
    }
    return classes;
  };

  // 在服务器端渲染初始状态，客户端渲染后再启用排序功能
  const displayProjects = isClient ? sortedProjects : projects;

  // Dashboard 版本的表头
  const renderDashboardHeader = () => (
    <tr className="bg-gray-50">
      <th 
        className={getThClassName('name')} 
        onClick={() => handleSort('name')}
        style={{ minWidth: '180px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Portfolio Name
          {renderSortIndicator('name')}
        </div>
      </th>
      <th 
        className={getThClassName('briefIntro')} 
        onClick={() => handleSort('briefIntro')}
        style={{ minWidth: '250px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Brief Intro
          {renderSortIndicator('briefIntro')}
        </div>
      </th>
      <th 
        className={getThClassName('investmentDate')} 
        onClick={() => handleSort('investmentDate')}
        style={{ minWidth: '120px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Investment Date
          {renderSortIndicator('investmentDate')}
        </div>
      </th>
      <th 
        className={getThClassName('capitalInvested')} 
        onClick={() => handleSort('capitalInvested')}
        style={{ minWidth: '130px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Capital Invested
          {renderSortIndicator('capitalInvested')}
        </div>
      </th>
      <th 
        className={getThClassName('moic')} 
        onClick={() => handleSort('moic')}
        style={{ minWidth: '80px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          MOIC
          {renderSortIndicator('moic')}
        </div>
      </th>
    </tr>
  );

  // Portfolio 版本的表头
  const renderPortfolioHeader = () => (
    <tr className="bg-gray-50">
      <th 
        className={getThClassName('name')} 
        onClick={() => handleSort('name')}
        style={{ minWidth: '180px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Portfolio Name
          {renderSortIndicator('name')}
        </div>
      </th>
      <th 
        className={getThClassName('investmentDate')} 
        onClick={() => handleSort('investmentDate')}
        style={{ minWidth: '120px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Investment Date
          {renderSortIndicator('investmentDate')}
        </div>
      </th>
      <th 
        className={getThClassName('capitalInvested')} 
        onClick={() => handleSort('capitalInvested')}
        style={{ minWidth: '130px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Capital Invested
          {renderSortIndicator('capitalInvested')}
        </div>
      </th>
      <th 
        className={getThClassName('initialShareholdingRatio')} 
        onClick={() => handleSort('initialShareholdingRatio')}
        style={{ minWidth: '120px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center whitespace-normal">
          Initial Shareholding Ratio
          {renderSortIndicator('initialShareholdingRatio')}
        </div>
      </th>
      <th 
        className={getThClassName('currentShareholdingRatio')} 
        onClick={() => handleSort('currentShareholdingRatio')}
        style={{ minWidth: '120px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center whitespace-normal">
          Current Shareholding Ratio
          {renderSortIndicator('currentShareholdingRatio')}
        </div>
      </th>
      <th 
        className={getThClassName('actualInvestmentAmount')} 
        onClick={() => handleSort('actualInvestmentAmount')}
        style={{ minWidth: '130px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center whitespace-normal">
          Actual Investment Amount
          {renderSortIndicator('actualInvestmentAmount')}
        </div>
      </th>
      <th 
        className={getThClassName('latestFinancingValuation')} 
        onClick={() => handleSort('latestFinancingValuation')}
        style={{ minWidth: '140px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center whitespace-normal">
          Latest Financing Valuation
          {renderSortIndicator('latestFinancingValuation')}
        </div>
      </th>
      <th 
        className={getThClassName('bookValue')} 
        onClick={() => handleSort('bookValue')}
        style={{ minWidth: '120px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          Book Value
          {renderSortIndicator('bookValue')}
        </div>
      </th>
      <th 
        className={getThClassName('moic')} 
        onClick={() => handleSort('moic')}
        style={{ minWidth: '80px', textAlign: 'left', whiteSpace: 'normal' }}
      >
        <div className="inline-flex items-center">
          MOIC
          {renderSortIndicator('moic')}
        </div>
      </th>
    </tr>
  );

  // Dashboard 版本的行内容
  const renderDashboardRow = (project: Project) => {
    const bookValue = calculateBookValue(project);
    const moic = calculateMoic(project, bookValue);
    
    return (
      <tr key={project.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          <Link href={`/portfolio/${project.id}`} className="text-inherit hover:underline">
            {project.name}
          </Link>
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {project.briefIntro || 'N/A'}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatDate(project.investmentDate)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatCurrency(project.capitalInvested)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {moic ? `${moic.toFixed(2)}x` : 'N/A'}
        </td>
      </tr>
    );
  };

  // Portfolio 版本的行内容
  const renderPortfolioRow = (project: Project) => {
    const bookValue = calculateBookValue(project);
    const moic = calculateMoic(project, bookValue);
    
    return (
      <tr key={project.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          <Link href={`/portfolio/${project.id}`} className="text-inherit hover:underline">
            {project.name}
          </Link>
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatDate(project.investmentDate)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatCurrency(project.capitalInvested)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatPercentage(project.initialShareholdingRatio)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatPercentage(project.currentShareholdingRatio)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatCurrency(project.investmentCost)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {formatCurrency(project.latestFinancingValuation)}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {bookValue ? formatCurrency(bookValue) : 'N/A'}
        </td>
        <td className="px-6 py-4 border-b border-gray-200 text-left whitespace-normal">
          {moic ? `${moic.toFixed(2)}x` : 'N/A'}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full">
      {/* Add a container with horizontal scroll for mobile */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="min-w-[800px] w-full">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                {variant === 'dashboard' ? renderDashboardHeader() : renderPortfolioHeader()}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayProjects.length === 0 ? (
                  <tr>
                    <td colSpan={variant === 'dashboard' ? 6 : 9} className="data-table-cell text-center py-10 text-gray-500">
                      No projects found. Add your first project.
                    </td>
                  </tr>
                ) : (
                  displayProjects.map((project) => (
                    variant === 'dashboard' ? renderDashboardRow(project) : renderPortfolioRow(project)
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectList; 