import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

const prisma = new PrismaClient();

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

export default async function ProjectDetailPage({
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
  const bookValue = project.latestFinancingValuation && project.currentShareholdingRatio
    ? project.latestFinancingValuation * (project.currentShareholdingRatio / 100)
    : project.bookValue;
    
  const moic = project.investmentCost && project.investmentCost > 0 && bookValue
    ? bookValue / project.investmentCost
    : project.moic;

  // Format date in YYYY/MM/DD format
  const formatDate = (date: Date | string): string => {
    return format(new Date(date), 'yyyy/MM/dd');
  };

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 sm:mb-0">{project.name}</h1>
        <Link href={`/portfolio/${project.id}/edit`} className="btn-primary text-sm">
          Edit Project
        </Link>
      </div>
      
      {/* Project Introduction */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-4 md:mb-8">
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Project Introduction</h2>
        <p className="text-sm md:text-base text-gray-700 whitespace-pre-line">
          {project.briefIntro || 'No project introduction available.'}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4 md:mb-8">
        {/* Transaction Process */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Transaction Process</h2>
          <div className="space-y-3">
            {project.documents && project.documents.length > 0 ? (
              project.documents.map((doc: any) => (
                <div key={doc.id} className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">{doc.name}</span>
                </div>
              ))
            ) : (
              <>
                {/* Example documents based on image */}
                <div className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">Project Business Plan: BP.pdf</span>
                </div>
                <div className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">Investment Committee Records: Investment Committee Records.pdf</span>
                </div>
                <div className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">Due Diligence Report.pdf</span>
                </div>
                <div className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">Investment Agreement: contract.pdf</span>
                </div>
                <div className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">Proof of Payment: trans.pdf</span>
                </div>
                <div className="p-2 md:p-3 border rounded flex items-center">
                  <DocumentTextIcon className="h-[0.8rem] w-[0.8rem] md:h-[1rem] md:w-[1rem] text-blue-500 mr-2 md:mr-3" />
                  <span className="text-sm md:text-base">Payment Receipt Acknowledge Letter: confirmation.pdf</span>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Portfolio Status */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow">
          <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Portfolio Status</h2>
          <p className="text-sm md:text-base text-gray-700 whitespace-pre-line">
            {project.portfolioStatus || 'Current portfolio status information is not available.'}
          </p>
        </div>
      </div>
    </div>
  );
} 