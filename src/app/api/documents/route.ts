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

export async function POST(request: NextRequest) {
  try {
    console.log('Document upload request received');
    
    // 检查请求是否是FormData
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const projectId = formData.get('projectId') as string;
      const name = formData.get('name') as string;
      const type = formData.get('type') as string;
      const description = formData.get('description') as string;
      
      console.log('Received document upload request:', {
        fileName: file?.name,
        projectId,
        name,
        type
      });
      
      // 验证必填字段
      if (!file || !projectId || !name || !type) {
        console.error('Missing required fields', { file: !!file, projectId, name, type });
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
      
      // 验证项目是否存在
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      
      if (!project) {
        console.error('Project not found:', projectId);
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      
      // 确保上传目录存在
      const uploadDir = await ensureUploadDirExists();
      
      // 生成安全的文件名（避免特殊字符）
      const originalFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFilename = `${uuidv4()}-${originalFileName}`;
      const filePath = join(uploadDir, uniqueFilename);
      
      console.log('Saving file to:', filePath);
      
      // 将文件保存到服务器
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      try {
        await writeFile(filePath, buffer);
        console.log('File saved successfully');
      } catch (fileError) {
        console.error('Error writing file:', fileError);
        return NextResponse.json(
          { error: 'Failed to save file to server' },
          { status: 500 }
        );
      }
      
      // 创建正确的URL路径
      const publicUrl = `/uploads/${uniqueFilename}`;
      
      console.log('Created public URL:', publicUrl);
      
      // 创建文档记录
      console.log('Creating document record in database');
      const document = await prisma.document.create({
        data: {
          name,
          type,
          url: publicUrl,
          projectId,
          description: description || null,
          isVisible: true,
        },
      });
      
      console.log('Document created successfully:', document.id);
      return NextResponse.json(document, { status: 201 });
    } else {
      // 处理JSON请求
      const data = await request.json();
      
      // 验证必填字段
      if (!data.name || !data.type || !data.projectId || !data.url) {
        return NextResponse.json(
          { error: 'Missing required fields' },
          { status: 400 }
        );
      }
      
      // 验证项目是否存在
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
      });
      
      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }
      
      // 创建新文档
      const document = await prisma.document.create({
        data: {
          name: data.name,
          type: data.type,
          url: data.url,
          projectId: data.projectId,
          isVisible: data.isVisible !== undefined ? data.isVisible : true,
          description: data.description || null,
        },
      });
      
      return NextResponse.json(document, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const visibleOnly = url.searchParams.get('visible') === 'true';
    
    // 构建查询条件
    const whereClause: any = {};
    
    // 根据类型筛选
    if (type) {
      whereClause.type = type;
    }
    
    // 只显示可见文档
    if (visibleOnly) {
      whereClause.isVisible = true;
    }
    
    console.log('Fetching documents with filters:', whereClause);
    
    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
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