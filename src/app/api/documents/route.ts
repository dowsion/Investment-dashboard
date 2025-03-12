import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const prisma = new PrismaClient();

// 确保上传目录存在
async function ensureUploadDirExists() {
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  try {
    // 检查目录是否存在
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory:', uploadDir);
      await mkdir(uploadDir, { recursive: true });
    }
    return uploadDir;
  } catch (error) {
    console.error('Error creating upload directory:', error);
    throw error;
  }
}

// 禁用API路由缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 从请求头中验证管理员权限
const verifyAdmin = (request: NextRequest) => {
  const adminAuth = request.headers.get('X-Admin-Auth');
  const adminToken = request.headers.get('X-Admin-Token');
  
  return adminAuth === 'true' && adminToken;
};

// 上传文档
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限 - 用于POST请求时
    const isAdmin = verifyAdmin(request);
    const formData = await request.formData();
    
    // 获取表单数据
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    
    // 数据验证
    if (!file || !projectId || !name || !type) {
      console.error('Missing required fields', { file: !!file, projectId, name, type });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 验证文件大小 (50MB限制)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      console.error('File too large:', file.size, 'bytes. Max allowed:', MAX_FILE_SIZE, 'bytes');
      return NextResponse.json(
        { error: `File size exceeds the limit (50MB). Current file size: ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 413 }
      );
    }
    
    // 验证文件类型
    // TODO: 实现文件类型验证
    
    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    
    if (!project) {
      console.error('Portfolio not found:', projectId);
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    // 保存文件到磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 创建上传目录
    const uploadDir = await ensureUploadDirExists();
    
    // 创建唯一文件名（文件时间戳 + 原始文件名）
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = join(uploadDir, fileName);
    
    // 执行写入
    await writeFile(filePath, buffer);
    
    // 保存文档元数据到数据库
    const document = await prisma.document.create({
      data: {
        name,
        type,
        url: `/uploads/${fileName}`,
        projectId,
        isVisible: true,
      },
    });
    
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// 创建文档记录（不上传文件，仅记录引用链接）
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员权限
    if (!verifyAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Only administrators can add documents' },
        { status: 403 }
      );
    }
    
    const data = await request.json();
    
    // 验证必填字段
    if (!data.name || !data.type || !data.projectId || !data.url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
    });
    
    if (!project) {
      return NextResponse.json(
        { error: 'Portfolio not found' },
        { status: 404 }
      );
    }
    
    // 保存文档记录到数据库
    const document = await prisma.document.create({
      data: {
        name: data.name,
        type: data.type,
        url: data.url,
        projectId: data.projectId,
        isVisible: data.isVisible !== false, // 默认为true
        description: data.description,
      },
    });
    
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

// 获取所有文档
export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      where: {
        isVisible: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        project: {
          select: {
            name: true,
          },
        },
      },
    });
    
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// 获取可见的文档（供前端显示）
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // 更新文档的可见性
    const document = await prisma.document.update({
      where: { id: data.id },
      data: { 
        isVisible: data.isVisible
      },
    });
    
    return NextResponse.json(document);
  } catch (error) {
    console.error('Error updating document visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update document visibility' },
      { status: 500 }
    );
  }
}

// 添加删除文档的API
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // 查找文档记录
    const document = await prisma.document.findUnique({
      where: { id }
    });
    
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    // 尝试删除实际文件
    try {
      if (document.url) {
        // 从URL提取文件名
        const filename = document.url.split('/').pop();
        if (filename) {
          const filePath = join(process.cwd(), 'public', 'uploads', filename);
          
          // 检查文件是否存在
          if (fs.existsSync(filePath)) {
            await unlink(filePath);
            console.log('Deleted file:', filePath);
          }
        }
      }
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // 继续删除数据库记录，即使文件删除失败
    }
    
    // 删除数据库记录
    await prisma.document.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
} 