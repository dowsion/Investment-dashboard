// admin-portfolio-tools.js
// 管理员工具脚本，用于管理Portfolio

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const prisma = new PrismaClient();
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 美化输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// 显示菜单
function showMenu() {
  console.clear();
  console.log(`${colors.blue}${colors.bright}============================================${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}         Portfolio 管理工具                 ${colors.reset}`);
  console.log(`${colors.blue}${colors.bright}============================================${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan} 1. 查看所有Portfolio${colors.reset}`);
  console.log(`${colors.cyan} 2. 添加新Portfolio${colors.reset}`);
  console.log(`${colors.cyan} 3. 修改Portfolio${colors.reset}`);
  console.log(`${colors.cyan} 4. 删除Portfolio${colors.reset}`);
  console.log(`${colors.cyan} 5. 查看所有文档${colors.reset}`);
  console.log(`${colors.cyan} 6. 测试数据库连接${colors.reset}`);
  console.log(`${colors.cyan} 7. 重置管理员权限${colors.reset}`);
  console.log(`${colors.cyan} 8. 退出${colors.reset}`);
  console.log('');
  
  rl.question(`${colors.yellow}请选择功能 (1-8): ${colors.reset}`, (answer) => {
    handleMenuSelection(answer);
  });
}

// 处理菜单选择
async function handleMenuSelection(selection) {
  switch(selection) {
    case '1':
      await listAllPortfolios();
      break;
    case '2':
      await addNewPortfolio();
      break;
    case '3':
      await updatePortfolio();
      break;
    case '4':
      await deletePortfolio();
      break;
    case '5':
      await listAllDocuments();
      break;
    case '6':
      await testDatabaseConnection();
      break;
    case '7':
      resetAdminRights();
      break;
    case '8':
      console.log(`${colors.green}感谢使用，再见！${colors.reset}`);
      rl.close();
      prisma.$disconnect();
      process.exit(0);
      break;
    default:
      console.log(`${colors.red}无效选择，请重新输入。${colors.reset}`);
      setTimeout(showMenu, 1500);
  }
}

// 列出所有Portfolio
async function listAllPortfolios() {
  try {
    console.log(`${colors.yellow}正在获取Portfolio列表...${colors.reset}`);
    const portfolios = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      include: { documents: true }
    });

    if (portfolios.length === 0) {
      console.log(`${colors.red}未找到任何Portfolio。${colors.reset}`);
    } else {
      console.log(`${colors.green}找到 ${portfolios.length} 个Portfolio:${colors.reset}`);
      portfolios.forEach((portfolio, index) => {
        console.log(`${colors.bright}${index + 1}. ${portfolio.name}${colors.reset}`);
        console.log(`   ID: ${portfolio.id}`);
        console.log(`   投资日期: ${new Date(portfolio.investmentDate).toISOString().split('T')[0]}`);
        console.log(`   投资金额: ${portfolio.capitalInvested}`);
        console.log(`   文档数量: ${portfolio.documents.length}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error(`${colors.red}获取Portfolio时出错: ${error.message}${colors.reset}`);
  }
  
  rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
    showMenu();
  });
}

// 添加新Portfolio
async function addNewPortfolio() {
  console.log(`${colors.cyan}${colors.bright}添加新Portfolio${colors.reset}`);
  console.log(`${colors.dim}请输入以下信息：${colors.reset}`);
  
  rl.question(`${colors.yellow}名称: ${colors.reset}`, (name) => {
    if (!name.trim()) {
      console.log(`${colors.red}错误: 名称不能为空${colors.reset}`);
      setTimeout(() => addNewPortfolio(), 1500);
      return;
    }
    
    rl.question(`${colors.yellow}投资日期 (YYYY-MM-DD): ${colors.reset}`, (dateStr) => {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.log(`${colors.red}错误: 无效的日期格式${colors.reset}`);
        setTimeout(() => addNewPortfolio(), 1500);
        return;
      }
      
      rl.question(`${colors.yellow}投资金额: ${colors.reset}`, async (amount) => {
        const capitalInvested = parseFloat(amount);
        if (isNaN(capitalInvested)) {
          console.log(`${colors.red}错误: 投资金额必须是数字${colors.reset}`);
          setTimeout(() => addNewPortfolio(), 1500);
          return;
        }
        
        try {
          const newPortfolio = await prisma.project.create({
            data: {
              name,
              investmentDate: date,
              capitalInvested,
              status: 'Active',
              riskLevel: 'Medium',
              expected_irr: 0,
              investment_term: 0
            }
          });
          
          console.log(`${colors.green}成功创建Portfolio: ${newPortfolio.name}${colors.reset}`);
          console.log(`ID: ${newPortfolio.id}`);
        } catch (error) {
          console.error(`${colors.red}创建Portfolio时出错: ${error.message}${colors.reset}`);
        }
        
        rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
          showMenu();
        });
      });
    });
  });
}

// 更新Portfolio
async function updatePortfolio() {
  try {
    const portfolios = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true }
    });
    
    if (portfolios.length === 0) {
      console.log(`${colors.red}未找到任何Portfolio可修改。${colors.reset}`);
      rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
        showMenu();
      });
      return;
    }
    
    console.log(`${colors.cyan}${colors.bright}修改Portfolio${colors.reset}`);
    console.log(`${colors.cyan}可用的Portfolio:${colors.reset}`);
    portfolios.forEach((portfolio, index) => {
      console.log(`${index + 1}. ${portfolio.name} (ID: ${portfolio.id})`);
    });
    
    rl.question(`\n${colors.yellow}请选择要修改的Portfolio编号 (1-${portfolios.length}): ${colors.reset}`, async (answer) => {
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= portfolios.length) {
        console.log(`${colors.red}无效的选择${colors.reset}`);
        setTimeout(() => updatePortfolio(), 1500);
        return;
      }
      
      const selectedPortfolio = portfolios[index];
      const portfolio = await prisma.project.findUnique({
        where: { id: selectedPortfolio.id }
      });
      
      console.log(`\n${colors.cyan}当前信息:${colors.reset}`);
      console.log(`名称: ${portfolio.name}`);
      console.log(`投资日期: ${new Date(portfolio.investmentDate).toISOString().split('T')[0]}`);
      console.log(`投资金额: ${portfolio.capitalInvested}`);
      console.log(`状态: ${portfolio.status}`);
      console.log(`风险级别: ${portfolio.riskLevel}`);
      
      console.log(`\n${colors.dim}输入新值或直接按Enter保持不变:${colors.reset}`);
      
      rl.question(`${colors.yellow}名称 [${portfolio.name}]: ${colors.reset}`, (name) => {
        const newName = name.trim() || portfolio.name;
        
        rl.question(`${colors.yellow}投资日期 [${new Date(portfolio.investmentDate).toISOString().split('T')[0]}]: ${colors.reset}`, (dateStr) => {
          let newDate = portfolio.investmentDate;
          if (dateStr.trim()) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              newDate = date;
            }
          }
          
          rl.question(`${colors.yellow}投资金额 [${portfolio.capitalInvested}]: ${colors.reset}`, async (amount) => {
            let newAmount = portfolio.capitalInvested;
            if (amount.trim()) {
              const capitalInvested = parseFloat(amount);
              if (!isNaN(capitalInvested)) {
                newAmount = capitalInvested;
              }
            }
            
            rl.question(`${colors.yellow}状态 [${portfolio.status}] (Active/Closed/Pending): ${colors.reset}`, async (status) => {
              const newStatus = status.trim() || portfolio.status;
              
              rl.question(`${colors.yellow}风险级别 [${portfolio.riskLevel}] (Low/Medium/High): ${colors.reset}`, async (risk) => {
                const newRisk = risk.trim() || portfolio.riskLevel;
                
                try {
                  const updatedPortfolio = await prisma.project.update({
                    where: { id: portfolio.id },
                    data: {
                      name: newName,
                      investmentDate: newDate,
                      capitalInvested: newAmount,
                      status: newStatus,
                      riskLevel: newRisk
                    }
                  });
                  
                  console.log(`${colors.green}成功更新Portfolio: ${updatedPortfolio.name}${colors.reset}`);
                } catch (error) {
                  console.error(`${colors.red}更新Portfolio时出错: ${error.message}${colors.reset}`);
                }
                
                rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
                  showMenu();
                });
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error(`${colors.red}获取Portfolio列表时出错: ${error.message}${colors.reset}`);
    rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
      showMenu();
    });
  }
}

// 删除Portfolio
async function deletePortfolio() {
  try {
    const portfolios = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true }
    });
    
    if (portfolios.length === 0) {
      console.log(`${colors.red}未找到任何Portfolio可删除。${colors.reset}`);
      rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
        showMenu();
      });
      return;
    }
    
    console.log(`${colors.cyan}${colors.bright}删除Portfolio${colors.reset}`);
    console.log(`${colors.cyan}可用的Portfolio:${colors.reset}`);
    portfolios.forEach((portfolio, index) => {
      console.log(`${index + 1}. ${portfolio.name} (ID: ${portfolio.id})`);
    });
    
    rl.question(`\n${colors.yellow}请选择要删除的Portfolio编号 (1-${portfolios.length}): ${colors.reset}`, (answer) => {
      const index = parseInt(answer) - 1;
      if (isNaN(index) || index < 0 || index >= portfolios.length) {
        console.log(`${colors.red}无效的选择${colors.reset}`);
        setTimeout(() => deletePortfolio(), 1500);
        return;
      }
      
      const selectedPortfolio = portfolios[index];
      rl.question(`${colors.red}确定要删除 "${selectedPortfolio.name}" 吗? 此操作不可撤销! (y/N): ${colors.reset}`, async (confirm) => {
        if (confirm.toLowerCase() === 'y') {
          try {
            // 首先删除关联的文档
            await prisma.document.deleteMany({
              where: { projectId: selectedPortfolio.id }
            });
            
            // 然后删除Portfolio
            await prisma.project.delete({
              where: { id: selectedPortfolio.id }
            });
            
            console.log(`${colors.green}成功删除Portfolio及其所有文档。${colors.reset}`);
          } catch (error) {
            console.error(`${colors.red}删除Portfolio时出错: ${error.message}${colors.reset}`);
          }
        } else {
          console.log(`${colors.yellow}已取消删除操作。${colors.reset}`);
        }
        
        rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
          showMenu();
        });
      });
    });
  } catch (error) {
    console.error(`${colors.red}获取Portfolio列表时出错: ${error.message}${colors.reset}`);
    rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
      showMenu();
    });
  }
}

// 列出所有文档
async function listAllDocuments() {
  try {
    console.log(`${colors.yellow}正在获取文档列表...${colors.reset}`);
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: { project: { select: { name: true } } }
    });

    if (documents.length === 0) {
      console.log(`${colors.red}未找到任何文档。${colors.reset}`);
    } else {
      console.log(`${colors.green}找到 ${documents.length} 个文档:${colors.reset}`);
      documents.forEach((doc, index) => {
        console.log(`${colors.bright}${index + 1}. ${doc.title}${colors.reset}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   类型: ${doc.type || '未指定'}`);
        console.log(`   文件名: ${doc.fileName || '未指定'}`);
        console.log(`   所属Portfolio: ${doc.project?.name || '未关联'}`);
        console.log(`   创建时间: ${new Date(doc.createdAt).toLocaleString()}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error(`${colors.red}获取文档时出错: ${error.message}${colors.reset}`);
  }
  
  rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
    showMenu();
  });
}

// 测试数据库连接
async function testDatabaseConnection() {
  console.log(`${colors.yellow}正在测试数据库连接...${colors.reset}`);
  
  try {
    // 尝试简单查询
    const count = await prisma.project.count();
    console.log(`${colors.green}数据库连接成功!${colors.reset}`);
    console.log(`当前有 ${count} 个Portfolio记录`);
    
    // 显示数据库URL（隐藏敏感信息）
    let dbUrl = process.env.DATABASE_URL || '未设置';
    if (dbUrl.includes('@')) {
      dbUrl = dbUrl.replace(/\/\/.*?@/, '//***:***@');
    }
    console.log(`数据库URL: ${dbUrl}`);
    
    // 检查Prisma模型
    console.log(`\n${colors.cyan}Prisma模型:${colors.reset}`);
    console.log(`- Project (Portfolio) 模型可用`);
    console.log(`- Document 模型可用`);
    
  } catch (error) {
    console.error(`${colors.red}数据库连接测试失败: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}请检查DATABASE_URL环境变量和数据库是否正确设置${colors.reset}`);
  }
  
  rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
    showMenu();
  });
}

// 重置管理员权限
function resetAdminRights() {
  console.log(`${colors.cyan}${colors.bright}重置管理员权限${colors.reset}`);
  console.log(`${colors.yellow}此操作将生成一个新的.env.local文件，包含管理员密码和令牌${colors.reset}`);
  
  rl.question(`${colors.red}确定要继续吗? (y/N): ${colors.reset}`, (confirm) => {
    if (confirm.toLowerCase() === 'y') {
      const adminPassword = Math.random().toString(36).slice(-10);
      const adminToken = Math.random().toString(36).slice(-10);
      
      const envContent = `NEXT_PUBLIC_ADMIN_PASSWORD=${adminPassword}\nNEXT_PUBLIC_ADMIN_TOKEN=${adminToken}\n`;
      
      try {
        fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
        console.log(`${colors.green}已成功重置管理员凭据:${colors.reset}`);
        console.log(`${colors.cyan}管理员密码: ${adminPassword}${colors.reset}`);
        console.log(`${colors.cyan}管理员令牌: ${adminToken}${colors.reset}`);
        console.log(`${colors.yellow}请记下这些信息，并在下次部署后使用它们登录管理界面${colors.reset}`);
      } catch (error) {
        console.error(`${colors.red}重置管理员权限时出错: ${error.message}${colors.reset}`);
      }
    } else {
      console.log(`${colors.yellow}已取消重置操作。${colors.reset}`);
    }
    
    rl.question(`\n${colors.yellow}按Enter返回主菜单...${colors.reset}`, () => {
      showMenu();
    });
  });
}

// 初始化程序
console.log(`${colors.green}正在启动Portfolio管理工具...${colors.reset}`);
console.log(`${colors.dim}连接到数据库...${colors.reset}`);
setTimeout(showMenu, 1000);

// 处理程序退出
process.on('SIGINT', () => {
  console.log(`\n${colors.green}正在清理并退出...${colors.reset}`);
  rl.close();
  prisma.$disconnect();
  process.exit(0);
}); 