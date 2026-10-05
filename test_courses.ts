import { prisma } from './src/lib/prisma';
async function testCourses() {
    try {
        const tenantId = 'cmunljxc7000004jwo5xs35jb';
        const courses = await prisma.course.findMany({ where: { tenantId } });
        console.log('Courses count:', courses.length);
        const batches = await prisma.batch.findMany({ where: { tenantId } });
        console.log('Batches count:', batches.length);
    } catch (e) {
        console.error(e);
    }
}
testCourses().finally(() => prisma.$disconnect());
