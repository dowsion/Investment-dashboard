import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const prisma = new PrismaClient();

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
        documents: true
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
          <div className="space-y-3">
            {portfolio.documents && portfolio.documents.length > 0 ? (
              portfolio.documents.map((doc: any) => (
                <Link
                  key={doc.id}
                  href={getDocumentUrl(doc.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 md:p-3 border rounded flex items-center hover:bg-gray-50 transition-colors"
                >
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">{doc.name}</span>
                </Link>
              ))
            ) : (
              <p className="text-gray-500">No documents available for this portfolio.</p>
            )}
          </div>
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