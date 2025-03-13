/**
 * 文件上传诊断工具 - 在生产环境运行此脚本来检查可能的问题
 * 使用方法: node diagnose-upload.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// 颜色输出函数
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

// 打印标题
console.log(colors.cyan('============================================='));
console.log(colors.cyan('     文件上传诊断工具 - 生产环境检查'));
console.log(colors.cyan('============================================='));

// 检查函数
async function runDiagnostics() {
  console.log(`\n${colors.blue('1. 系统信息检查')}`);
  checkSystemInfo();

  console.log(`\n${colors.blue('2. 文件权限和目录检查')}`);
  checkFilesAndPermissions();
  
  console.log(`\n${colors.blue('3. 网络和API配置检查')}`);
  checkNetworkAndApiConfig();
  
  console.log(`\n${colors.blue('4. 日志检查')}`);
  checkLogs();
  
  console.log(`\n${colors.blue('5. 临时测试上传')}`);
  await testUpload();
  
  console.log(`\n${colors.magenta('诊断完成 - 请检查上述结果以确定问题所在')}`);
}

// 1. 系统信息检查
function checkSystemInfo() {
  try {
    // 获取系统信息
    console.log(`操作系统: ${os.type()} ${os.release()}`);
    console.log(`主机名: ${os.hostname()}`);
    console.log(`内存总量: ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB`);
    console.log(`可用内存: ${Math.round(os.freemem() / (1024 * 1024 * 1024))} GB`);
    console.log(`CPU架构: ${os.arch()}`);
    console.log(`CPU核心: ${os.cpus().length}`);
    
    // 检查Node.js和npm版本
    const nodeVersion = process.version;
    console.log(`Node.js版本: ${nodeVersion}`);
    
    try {
      const npmVersion = execSync('npm -v').toString().trim();
      console.log(`npm版本: ${npmVersion}`);
    } catch (error) {
      console.log(colors.yellow(`无法检查npm版本: ${error.message}`));
    }
    
    // 检查磁盘空间
    try {
      // Linux/Mac
      if (os.type() === 'Linux' || os.type() === 'Darwin') {
        const diskSpace = execSync('df -h .').toString();
        console.log("磁盘空间情况:\n" + diskSpace);
      } 
      // Windows
      else if (os.type() === 'Windows_NT') {
        console.log("Windows系统 - 请手动检查磁盘空间");
      }
    } catch (error) {
      console.log(colors.yellow(`无法检查磁盘空间: ${error.message}`));
    }
    
    // 检查进程信息
    if (process.env.PM2_HOME) {
      console.log("正在通过PM2运行");
    }
    
    // 检查环境变量
    console.log(`NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
    console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS || '未设置'}`);
  } catch (error) {
    console.log(colors.red(`系统信息检查失败: ${error.message}`));
  }
}

// 2. 文件权限和目录检查
function checkFilesAndPermissions() {
  // 检查uploads目录
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  
  console.log(`上传目录路径: ${uploadDir}`);
  
  try {
    // 检查目录是否存在
    if (fs.existsSync(uploadDir)) {
      console.log(colors.green(`✓ uploads目录存在`));
      
      // 检查权限
      try {
        // 尝试在目录中创建测试文件
        const testFile = path.join(uploadDir, `test-${Date.now()}.txt`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log(colors.green(`✓ 应用有uploads目录的写入权限`));
      } catch (error) {
        console.log(colors.red(`✗ 应用没有uploads目录的写入权限: ${error.message}`));
        
        // 在Linux/Mac上检查目录的权限
        if (os.type() === 'Linux' || os.type() === 'Darwin') {
          try {
            const permissions = execSync(`ls -la ${uploadDir}`).toString();
            console.log(`目录权限详情:\n${permissions}`);
          } catch (lsError) {
            console.log(`无法获取目录权限详情: ${lsError.message}`);
          }
        }
      }
      
      // 检查目录中的文件数量
      try {
        const files = fs.readdirSync(uploadDir);
        console.log(`目录中的文件数量: ${files.length}`);
        
        // 取样一些文件
        if (files.length > 0) {
          console.log("目录中的部分文件:");
          files.slice(0, 5).forEach(file => {
            try {
              const stats = fs.statSync(path.join(uploadDir, file));
              console.log(`- ${file} (${Math.round(stats.size / 1024)} KB, 创建于 ${stats.ctime})`);
            } catch (e) {
              console.log(`- ${file} (无法获取文件信息)`);
            }
          });
          
          if (files.length > 5) {
            console.log(`... 以及其他 ${files.length - 5} 个文件`);
          }
        }
      } catch (error) {
        console.log(colors.red(`✗ 无法读取uploads目录内容: ${error.message}`));
      }
    } else {
      console.log(colors.red(`✗ uploads目录不存在`));
      
      // 检查public目录
      const publicDir = path.join(process.cwd(), 'public');
      if (fs.existsSync(publicDir)) {
        console.log(colors.green(`✓ public目录存在`));
        try {
          // 尝试创建uploads目录
          fs.mkdirSync(uploadDir);
          console.log(colors.green(`✓ 成功创建uploads目录`));
          fs.rmdirSync(uploadDir); // 清理
        } catch (error) {
          console.log(colors.red(`✗ 无法创建uploads目录: ${error.message}`));
        }
      } else {
        console.log(colors.red(`✗ public目录不存在`));
      }
    }
  } catch (error) {
    console.log(colors.red(`目录检查发生错误: ${error.message}`));
  }
  
  // 检查.next目录
  try {
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
      console.log(colors.green(`✓ .next目录存在 (应用已编译)`));
    } else {
      console.log(colors.red(`✗ .next目录不存在 (应用可能未编译)`));
    }
  } catch (error) {
    console.log(colors.yellow(`无法检查.next目录: ${error.message}`));
  }
}

// 3. 网络和API配置检查
function checkNetworkAndApiConfig() {
  // 检查API配置
  try {
    const apiRouteFile = path.join(process.cwd(), 'src', 'app', 'api', 'documents', 'route.ts');
    if (fs.existsSync(apiRouteFile)) {
      const content = fs.readFileSync(apiRouteFile, 'utf8');
      
      // 检查文件大小限制设置
      const fileSizeMatch = content.match(/MAX_FILE_SIZE\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
      if (fileSizeMatch) {
        const fileSizeLimit = parseInt(fileSizeMatch[1]);
        console.log(`文件大小限制设置: ${fileSizeLimit}MB`);
        
        if (fileSizeLimit < 10) {
          console.log(colors.yellow(`⚠ 文件大小限制较小，可能需要增加`));
        }
      } else {
        console.log(colors.yellow(`⚠ 无法解析文件大小限制设置`));
      }
      
      // 检查请求大小限制设置
      const requestSizeMatch = content.match(/MAX_REQUEST_SIZE\s*=\s*(\d+)\s*\*\s*1024\s*\*\s*1024/);
      if (requestSizeMatch) {
        const requestSizeLimit = parseInt(requestSizeMatch[1]);
        console.log(`请求大小限制设置: ${requestSizeLimit}MB`);
        
        if (requestSizeLimit < 15) {
          console.log(colors.yellow(`⚠ 请求大小限制较小，可能需要增加`));
        }
      } else {
        console.log(colors.yellow(`⚠ 无法解析请求大小限制设置`));
      }
      
      // 检查API配置
      if (content.includes('export const config')) {
        console.log(colors.green(`✓ API配置已定义`));
      } else {
        console.log(colors.yellow(`⚠ 未找到API配置 export const config`));
      }
    } else {
      console.log(colors.red(`✗ API路由文件不存在: ${apiRouteFile}`));
    }
  } catch (error) {
    console.log(colors.red(`API配置检查失败: ${error.message}`));
  }
  
  // 检查nginx配置(如果存在)
  try {
    // 检查常见的nginx配置位置
    const nginxConfigPaths = [
      '/etc/nginx/nginx.conf',
      '/etc/nginx/conf.d/default.conf',
      '/etc/nginx/sites-enabled/default',
      '/etc/nginx/sites-available/default'
    ];
    
    let foundNginx = false;
    
    for (const configPath of nginxConfigPaths) {
      if (fs.existsSync(configPath)) {
        foundNginx = true;
        console.log(`找到nginx配置文件: ${configPath}`);
        
        const configContent = fs.readFileSync(configPath, 'utf8');
        
        // 检查client_max_body_size设置
        const clientMaxBodySizeMatch = configContent.match(/client_max_body_size\s+(\d+)(\w+);/);
        if (clientMaxBodySizeMatch) {
          const size = clientMaxBodySizeMatch[1];
          const unit = clientMaxBodySizeMatch[2];
          console.log(colors.green(`✓ nginx client_max_body_size配置: ${size}${unit}`));
          
          // 检查是否足够大
          if ((unit === 'm' || unit === 'M') && parseInt(size) < 10) {
            console.log(colors.yellow(`⚠ nginx的client_max_body_size较小，可能需要增加`));
          }
        } else {
          console.log(colors.yellow(`⚠ 未找到nginx client_max_body_size配置，可能使用默认值1MB`));
        }
        
        break;
      }
    }
    
    if (!foundNginx) {
      console.log(colors.yellow(`未发现nginx配置文件，可能没有使用nginx或配置在非标准位置`));
    }
  } catch (error) {
    console.log(colors.yellow(`nginx配置检查失败: ${error.message}`));
  }
}

// 4. 日志检查
function checkLogs() {
  // 检查PM2日志
  try {
    if (fs.existsSync(path.join(os.homedir(), '.pm2'))) {
      console.log(colors.cyan(`PM2日志位置: ~/.pm2/logs/`));
      console.log(`查看完整日志请运行: pm2 logs investment-dashboard`);
      
      // 尝试读取最近的日志
      try {
        let logContent = '';
        
        // 尝试获取错误日志
        const errorLogPath = path.join(os.homedir(), '.pm2', 'logs', 'investment-dashboard-error.log');
        if (fs.existsSync(errorLogPath)) {
          // 获取最后100行
          const command = os.type() === 'Windows_NT' 
            ? `powershell -command "Get-Content -Tail 100 '${errorLogPath}'"`
            : `tail -n 100 "${errorLogPath}"`;
            
          try {
            const recentErrors = execSync(command).toString();
            
            if (recentErrors.trim().length > 0) {
              const uploadErrors = recentErrors.split('\n')
                .filter(line => line.includes('upload') || line.includes('file') || line.includes('document'))
                .slice(-10)
                .join('\n');
                
              if (uploadErrors.length > 0) {
                console.log(colors.yellow("最近的上传相关错误:"));
                console.log(uploadErrors);
              } else {
                console.log("未发现最近的上传相关错误");
              }
            } else {
              console.log("错误日志为空");
            }
          } catch (tailError) {
            console.log(colors.yellow(`无法读取错误日志: ${tailError.message}`));
          }
        } else {
          console.log(colors.yellow(`未找到PM2错误日志文件: ${errorLogPath}`));
        }
      } catch (error) {
        console.log(colors.yellow(`日志内容检索失败: ${error.message}`));
      }
    } else {
      console.log(colors.yellow(`未找到PM2日志目录`));
    }
  } catch (error) {
    console.log(colors.yellow(`日志检查失败: ${error.message}`));
  }
}

// 5. 测试上传
async function testUpload() {
  console.log("创建测试文件进行上传测试...");
  
  // 创建测试文件路径
  const testFilePath = path.join(os.tmpdir(), `upload-test-${Date.now()}.txt`);
  
  try {
    // 创建一个3MB的测试文件
    const testFileSize = 3 * 1024 * 1024; // 3MB
    const buffer = Buffer.alloc(testFileSize, 'a');
    fs.writeFileSync(testFilePath, buffer);
    
    console.log(`创建了${testFileSize / (1024 * 1024)}MB的测试文件: ${testFilePath}`);
    
    console.log(colors.yellow("测试上传过程需要手动执行:"));
    console.log(`1. 登录到管理员界面`);
    console.log(`2. 选择"Upload Document"选项`);
    console.log(`3. 上传此测试文件: ${testFilePath}`);
    console.log(`4. 检查上传结果和浏览器开发者工具中的网络请求情况`);
    
  } catch (error) {
    console.log(colors.red(`测试文件创建失败: ${error.message}`));
  }
}

// 运行诊断
runDiagnostics().catch(error => {
  console.error(colors.red(`诊断过程发生错误: ${error.message}`));
}); 