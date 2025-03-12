import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import prisma from '@/lib/prisma';

const prismaClient = new PrismaClient();

// 禁用API路由缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份 - 使用自定义的身份验证方法
    const adminAuth = request.headers.get('X-Admin-Auth');
    const adminToken = request.headers.get('X-Admin-Token');
    
    // 如果没有管理员令牌，则拒绝请求
    if (adminAuth !== 'true' || !adminToken) {
      return NextResponse.json(
        { error: 'Unauthorized - Only administrators can add new portfolios' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.investmentDate || data.capitalInvested === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Create new portfolio
    const project = await prismaClient.project.create({
      data: {
        name: data.name,
        briefIntro: data.briefIntro,
        portfolioStatus: data.portfolioStatus,
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
    
    return NextResponse.json(project, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error creating portfolio:', error);
    return NextResponse.json(
      { error: 'Failed to create portfolio' },
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
    
    return NextResponse.json(projects, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Error fetching portfolios:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolios' },
      { status: 500 }
    );
  }
} 