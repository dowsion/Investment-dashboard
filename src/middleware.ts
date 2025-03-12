import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import fs from 'fs';

// 处理文件访问请求的中间件
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 只处理/uploads路径下的请求
  if (pathname.startsWith('/uploads/')) {
    console.log('Processing uploads request:', pathname);
    
    // 获取文件路径
    const filename = pathname.replace('/uploads/', '');
    const filePath = join(process.cwd(), 'public', 'uploads', filename);
    
    // 检查文件是否存在（记录但不中断）
    try {
      if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
      } else {
        console.log('File exists, serving:', filePath);
      }
    } catch (error) {
      console.error('Error checking file:', error);
    }
  }
  
  return NextResponse.next();
}

// 中间件配置
export const config = {
  // 只匹配uploads路径
  matcher: ['/uploads/:path*'],
}; 