import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const prisma = new PrismaClient();

// 文档类型映射
const documentTypeMap: Record<string, string> = {
  'business_plan': 'Project Business Plan',
  'investment_committee': 'Investment Committee Records',
  'due_diligence': 'Due Diligence',
  'contract': 'Investment Agreement',
  'payment_proof': 'Proof of Payment',
  'receipt': 'Payment Receipt Acknowledge Letter',
  'general': 'General Disclosure',
  'other': 'Other Documents'
};

// 文档类型排序顺序 - 调整为与图片一致的顺序
const typeOrder = [
  'business_plan',
  'investment_committee',
  'due_diligence',
  'contract',
  'payment_proof',
  'receipt',
  'general',
  'other'
];

// 根据文档URL获取可靠的访问URL
function getDocumentUrl(originalUrl: string) {
  // 如果URL以/uploads/开头，转换为API路由
  if (originalUrl.startsWith('/uploads/')) {
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
        documents: {
          where: {
            isVisible: true,
          },
          orderBy: {
            createdAt: 'desc',
          }
        }
      }
    });
    
    return project;
  } catch (error) {
    console.error("Error fetching portfolio:", error);
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
  const portfolio = await getProject(id);
  
  if (!portfolio) {
    notFound();
  }

  // Calculate values using the correct formulas
  const bookValue = portfolio.latestFinancingValuation && portfolio.currentShareholdingRatio
    ? portfolio.latestFinancingValuation * (portfolio.currentShareholdingRatio / 100)
    : portfolio.bookValue;
    
  const moic = portfolio.investmentCost && portfolio.investmentCost > 0 && bookValue
    ? bookValue / portfolio.investmentCost
    : portfolio.moic;

  // Format date in YYYY/MM/DD format
  const formatDate = (date: Date | string): string => {
    return format(new Date(date), 'yyyy/MM/dd');
  };

  // 按类型对文档分组
  const documentsByType: Record<string, any[]> = {};
  
  // 将文档按类型分组
  if (portfolio.documents && portfolio.documents.length > 0) {
    portfolio.documents.forEach((doc: any) => {
      const type = doc.type || 'other';
      if (!documentsByType[type]) {
        documentsByType[type] = [];
      }
      documentsByType[type].push(doc);
    });
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0">{portfolio.name}</h1>
      </div>
      
      {/* Portfolio Introduction */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-4 md:mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Portfolio Introduction</h2>
        <p className="text-sm md:text-base text-gray-700 whitespace-pre-line">
          {portfolio.briefIntro || 'No portfolio introduction available.'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
        {/* Transaction Process */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Transaction Process</h2>
          
          {!portfolio.documents || portfolio.documents.length === 0 ? (
            <p className="text-gray-500">No documents available for this portfolio.</p>
          ) : (
            <div className="space-y-4">
              {/* 按照指定顺序显示文档类型及文件 */}
              {typeOrder.map(type => {
                if (!documentsByType[type] || documentsByType[type].length === 0) return null;
                
                // 取该类型的首个文档显示
                const doc = documentsByType[type][0];
                
                return (
                  <div key={type} className="border-b pb-3 mb-3 last:border-b-0">
                    <Link
                      href={getDocumentUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="text-sm md:text-base">
                        <span className="font-medium">{documentTypeMap[type]}: </span>
                        <span className="text-blue-600">{doc.name}</span>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Portfolio Status */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Portfolio Status</h2>
          <p className="text-sm md:text-base text-gray-700 whitespace-pre-line">
            Current portfolio status information is not available in the database at this time.
          </p>
        </div>
      </div>
    </div>
  );
} 