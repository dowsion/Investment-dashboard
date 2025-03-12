import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract the id from params
    const { id } = params;
    
    const project = await prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        documents: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract the id from params
    const { id } = params;
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.investmentDate || data.capitalInvested === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
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
        // 计算Book Value: Latest Financing Valuation * Current Shareholding Ratio
        bookValue: data.latestFinancingValuation && data.currentShareholdingRatio 
          ? data.latestFinancingValuation * (data.currentShareholdingRatio / 100)
          : data.bookValue,
        moic: data.moic,
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Extract the id from params
    const { id } = params;
    
    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete all documents associated with the project
    await prisma.document.deleteMany({
      where: {
        projectId: id,
      },
    });

    // Delete the project
    await prisma.project.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
} 