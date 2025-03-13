import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import fs from 'fs';

// 获取文件MIME类型的辅助函数
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
  };
  
  return ext && mimeTypes[ext] ? mimeTypes[ext] : 'application/octet-stream';
}

// 设置API配置
export const config = {
  api: {
    // 禁用响应大小限制，允许更大的文件下载
    responseLimit: false
  },
};

// 文件服务API
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // 构建文件路径
    const filePath = params.path.join('/');
    const fullPath = join(process.cwd(), 'public', 'uploads', filePath);
    
    console.log('API files route - Serving file:', fullPath);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      console.error('File not found in API route:', fullPath);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // 读取文件
    const fileBuffer = await readFile(fullPath);
    
    // 获取文件名
    const filename = filePath.split('/').pop() || 'download';
    
    // 设置正确的内容类型
    const contentType = getMimeType(filename);
    
    // 创建响应头
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `inline; filename="${filename}"`);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
} 