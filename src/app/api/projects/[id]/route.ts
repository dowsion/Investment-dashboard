import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Disable caching for API routes
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 验证管理员身份的函数
const verifyAdmin = (request: NextRequest) => {
  const adminAuth = request.headers.get('X-Admin-Auth');
  const adminToken = request.headers.get('X-Admin-Token');
  
  return adminAuth === 'true' && adminToken;
};

// GET a single portfolio by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        documents: true
      }
    });
    
    if (!project) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(project);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the portfolio' },
      { status: 500 }
    );
  }
}

// UPDATE portfolio
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员身份
    if (!verifyAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only administrators can update portfolios' },
        { status: 403 }
      );
    }
    
    const id = params.id;
    const data = await request.json();
    
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    // Update the project with new data
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        briefIntro: data.briefIntro,
        portfolioStatus: data.portfolioStatus,
        investmentDate: data.investmentDate,
        capitalInvested: data.capitalInvested,
        initialShareholdingRatio: data.initialShareholdingRatio,
        currentShareholdingRatio: data.currentShareholdingRatio,
        investmentCost: data.investmentCost,
        latestFinancingValuation: data.latestFinancingValuation,
        bookValue: data.bookValue,
        moic: data.moic,
      },
    });
    
    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to update portfolio' },
      { status: 500 }
    );
  }
}

// DELETE portfolio
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证管理员身份
    if (!verifyAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only administrators can delete portfolios' },
        { status: 403 }
      );
    }
    
    const id = params.id;
    
    // Check if the project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    // Delete the project
    await prisma.project.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to delete portfolio' },
      { status: 500 }
    );
  }
} 