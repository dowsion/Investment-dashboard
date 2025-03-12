import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { DocumentTextIcon, DocumentChartBarIcon, ClipboardDocumentCheckIcon, MagnifyingGlassCircleIcon, DocumentIcon, BanknotesIcon, ReceiptRefundIcon, InformationCircleIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';

const prisma = new PrismaClient();

// 文档类型映射
const documentTypeMap: Record<string, string> = {
  'business_plan': 'Portfolio Business Plan',
  'investment_committee': 'Investment Committee Records',
  'due_diligence': 'Due Diligence',
  'contract': 'Investment Agreement',
  'payment_proof': 'Proof of Payment',
  'receipt': 'Payment Receipt Acknowledge Letter',
  'general': 'General Disclosure',
  'other': 'Other Documents'
};

// 文档类型对应的图标映射
const documentIconMap: Record<string, any> = {
  'business_plan': DocumentChartBarIcon,
  'investment_committee': ClipboardDocumentCheckIcon,
  'due_diligence': MagnifyingGlassCircleIcon,
  'contract': DocumentIcon,
  'payment_proof': BanknotesIcon,
  'receipt': ReceiptRefundIcon,
  'general': InformationCircleIcon,
  'other': DocumentDuplicateIcon
};

// 根据文档URL获取可靠的访问URL
function getDocumentUrl(originalUrl: string) {
  // 如果URL以/uploads/开头，转换为API路由
  if (originalUrl && originalUrl.startsWith('/uploads/')) {
    const filename = originalUrl.replace('/uploads/', '');
    return `/api/files/${filename}`;
  }
  return originalUrl;
}

async function getProject(id: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        documents: true
      }
    });
    
    return project;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

export default async function PortfolioDetailPage({
  params
}: {
  params: { id: string };
}) {
  // Use the id from params in a type-safe way
  const { id } = params;
  const project = await getProject(id);
  
  if (!project) {
    notFound();
  }

  // Calculate values using the correct formulas
  // Book Value = Latest Financing Valuation * Current Shareholding Ratio
  const bookValue = project.latestFinancingValuation && project.currentShareholdingRatio
    ? project.latestFinancingValuation * (project.currentShareholdingRatio / 100)
    : project.bookValue || 0;
    
  const moic = project.investmentCost && project.investmentCost > 0 && bookValue
    ? bookValue / project.investmentCost
    : project.moic || 0;

  // Format date in YYYY/MM/DD format
  const formatDate = (date: Date | string): string => {
    return format(new Date(date), 'yyyy/MM/dd');
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0">{project.name}</h1>
      </div>
      
      {/* Portfolio Introduction */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-4 md:mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Portfolio Introduction</h2>
        <p className="text-sm md:text-base text-gray-700 whitespace-pre-line">
          {project.briefIntro || 'No portfolio introduction available.'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
        {/* Transaction Process */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Transaction Process</h2>
          <div className="space-y-3">
            {project.documents && project.documents.length > 0 ? (
              project.documents.map((doc: any) => {
                const type = doc.type || 'other';
                const IconComponent = documentIconMap[type] || DocumentTextIcon;
                
                // 获取文件名
                let fileName = '';
                if (doc.url && doc.url.includes('/')) {
                  fileName = doc.url.split('/').pop() || '';
                }
                
                return (
                  <div key={doc.id} className="p-2 md:p-3 border rounded">
                    <Link 
                      href={getDocumentUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:bg-gray-50 transition-colors"
                    >
                      <IconComponent className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{documentTypeMap[type]}</span>
                        {fileName && <span className="text-gray-600 ml-1">: {fileName}</span>}
                      </div>
                    </Link>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-500">No documents available for this portfolio.</p>
            )}
          </div>
        </div>
        
        {/* Portfolio Performance */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Portfolio Performance</h2>
          <p className="text-sm md:text-base text-gray-700 whitespace-pre-line">
            {project.portfolioStatus || 'Current portfolio performance information is not available.'}
          </p>
        </div>
      </div>
    </div>
  );
} 