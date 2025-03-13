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

// Next.js App Router API配置 - 使用新的方式
export const maxDuration = 60; // 允许API路由运行更长时间
export const fetchCache = 'force-no-store';

// 设置API配置 - 注意：在App Router中此配置可能不再完全有效
export const config = {
  api: {
    // 增加请求体大小限制为100MB
    bodyParser: {
      sizeLimit: '100mb',
    },
    // 增加响应大小限制为100MB
    responseLimit: '100mb',
  },
};

// 将文件大小限制设为10MB (更合理的限制，避免过大文件导致问题)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// 检查请求大小是否超过限制 - 修改为更宽松的检查
function checkRequestSize(request: NextRequest): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    // 设置为更大值，允许额外的表单数据
    const MAX_REQUEST_SIZE = 120 * 1024 * 1024; // 120MB
    
    if (size > MAX_REQUEST_SIZE) {
      console.error(`Request size (${size} bytes / ${(size / (1024 * 1024)).toFixed(2)}MB) exceeds the limit (${MAX_REQUEST_SIZE} bytes / ${(MAX_REQUEST_SIZE / (1024 * 1024)).toFixed(2)}MB)`);
      return false;
    }
  }
  return true;
}

// 从请求头中验证管理员权限
const verifyAdmin = (request: NextRequest) => {
  const adminAuth = request.headers.get('X-Admin-Auth');
  const adminToken = request.headers.get('X-Admin-Token');
  
  return adminAuth === 'true' && adminToken;
};

// 上传文档
export async function POST(request: NextRequest) {
  try {
    // 记录请求信息
    const contentLength = request.headers.get('content-length');
    console.log(`Received upload request: Content-Length: ${contentLength} bytes (${contentLength ? (parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2) : 'unknown'} MB)`);
    
    // 检查请求大小
    if (!checkRequestSize(request)) {
      return NextResponse.json(
        { error: '请求大小超过限制 (120MB)' },
        { status: 413 }
      );
    }

    // 验证管理员权限 - 用于POST请求时
    const isAdmin = verifyAdmin(request);
    console.log("Admin authentication:", isAdmin ? "Successful" : "Failed");
    
    const formData = await request.formData();
    
    // 获取表单数据
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    
    console.log("Received document upload request:", { 
      hasFile: !!file, 
      fileName: file?.name,
      fileSize: file?.size,
      projectId, 
      name, 
      type 
    });
    
    // 数据验证
    if (!file || !name || !type) {
      console.error('Missing required fields', { file: !!file, projectId, name, type });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 对于非general类型的文档，projectId是必需的
    if (type !== 'general' && !projectId) {
      console.error('Missing projectId for non-general document');
      return NextResponse.json(
        { error: 'Project ID is required for portfolio-specific documents' },
        { status: 400 }
      );
    }
    
    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      console.error(`File too large: ${file.size} bytes (${(file.size / (1024 * 1024)).toFixed(2)} MB). Max allowed: ${MAX_FILE_SIZE} bytes (${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(2)} MB)`);
      return NextResponse.json(
        { error: `文件大小超过限制 (100MB)。当前文件大小: ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 413 }
      );
    }
    
    // 验证文件类型
    // TODO: 实现文件类型验证
    
    // 验证项目存在（仅对于非general类型的文档）
    if (type !== 'general' && projectId) {
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
    }
    
    // 保存文件到磁盘
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // 创建上传目录
    console.log("Creating upload directory if needed");
    const uploadDir = await ensureUploadDirExists();
    console.log("Upload directory path:", uploadDir);
    
    // 创建唯一文件名（文件时间戳 + 原始文件名）
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/\s+/g, '_')}`;
    const filePath = join(uploadDir, fileName);
    console.log("Saving file to:", filePath);
    
    try {
      // 执行写入
      await writeFile(filePath, buffer);
      console.log("File successfully written to disk");
    } catch (writeError) {
      console.error("Failed to write file to disk:", writeError);
      return NextResponse.json(
        { error: `Failed to save file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    // 保存文档元数据到数据库
    const documentData: any = {
      name,
      type,
      url: `/uploads/${fileName}`,
      isVisible: true,
    };
    
    // 处理projectId (Prisma模型中projectId可能是必需的)
    if (type !== 'general') {
      // 对于非general类型文档，使用提供的projectId
      if (projectId) {
        documentData.projectId = projectId;
      } else {
        return NextResponse.json(
          { error: 'Project ID is required for portfolio-specific documents' },
          { status: 400 }
        );
      }
    } else {
      // 对于general类型文档，如果提供了projectId则使用，否则查找或创建一个默认项目
      if (projectId) {
        documentData.projectId = projectId;
      } else {
        // 查找一个名为"General Documents"的默认项目，如果不存在则创建一个
        let generalProject = await prisma.project.findFirst({
          where: { name: "General Documents" }
        });
        
        if (!generalProject) {
          console.log("Creating a default 'General Documents' portfolio");
          
          try {
            // 创建项目时使用完整的数据结构
            const now = new Date();
            
            generalProject = await prisma.project.create({
              data: {
                name: "General Documents",
                briefIntro: "This is a system-generated portfolio for general documents that don't belong to any specific portfolio.",
                portfolioStatus: "",
                investmentDate: now, // 直接使用Date对象，让Prisma处理转换
                capitalInvested: 0,
                initialShareholdingRatio: 0,
                currentShareholdingRatio: 0,
                investmentCost: 0,
                latestFinancingValuation: 0,
                bookValue: 0,
                moic: 0,
              }
            });
            
            console.log("Successfully created 'General Documents' portfolio:", generalProject);
          } catch (createError) {
            console.error("Failed to create 'General Documents' portfolio:", createError);
            throw createError; // 重新抛出错误以便上层处理
          }
        }
        
        if (generalProject) {
          console.log("Using 'General Documents' portfolio:", generalProject.id);
          documentData.projectId = generalProject.id;
        } else {
          // 如果未能获取或创建项目，我们不能继续
          throw new Error("Failed to get or create the 'General Documents' portfolio");
        }
      }
    }
    
    console.log("Creating document with data:", documentData);
    
    const document = await prisma.document.create({
      data: documentData,
    });
    
    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    
    // 获取并记录更详细的错误信息
    let errorMessage = 'Failed to upload document';
    if (error instanceof Error) {
      errorMessage = `${errorMessage}: ${error.message}`;
      console.error('Error details:', error.stack);
    }
    
    // 检查是否为权限错误
    const errorString = String(error);
    if (errorString.includes('permission') || errorString.includes('EACCES')) {
      errorMessage = `File system permission error: ${errorMessage}`;
      console.error('Likely a permissions issue with the upload directory');
    }
    
    return NextResponse.json(
      { error: errorMessage },
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