import prisma from './prisma';

// 禁用Next.js的默认数据缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function getProjects(limit?: number) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: {
        investmentDate: 'desc'
      },
      ...(limit ? { take: limit } : {})
    });
    return projects;
  } catch (error) {
    console.error("Database error:", error);
    return [];
  }
}

export async function getProjectById(id: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id }
    });
    return project;
  } catch (error) {
    console.error("Database error:", error);
    return null;
  }
} 