import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.investmentDate || data.capitalInvested === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create new project
    const project = await prisma.project.create({
      data: {
        name: data.name,
        briefIntro: data.briefIntro,
        investmentDate: new Date(data.investmentDate),
        capitalInvested: data.capitalInvested,
        initialShareholdingRatio: data.initialShareholdingRatio,
        currentShareholdingRatio: data.currentShareholdingRatio,
        investmentCost: data.investmentCost,
        latestFinancingValuation: data.latestFinancingValuation,
        bookValue: data.bookValue,
        moic: data.moic,
      },
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        investmentDate: 'desc',
      },
    });
    
    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
} 