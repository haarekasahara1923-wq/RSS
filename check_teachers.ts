import { prisma } from './src/lib/prisma';
async function test() {
    const users = await prisma.user.findMany({ where: { role: 'TEACHER' }, include: { teacherProfile: true } });
    console.log("TEACHERS IN DB:");
    users.forEach(u => {
        console.log(`Email: ${u.email}, TeacherProfile ID: ${u.teacherProfile?.id}, TeacherProfile UserID: ${u.teacherProfile?.userId}`);
    });
}
test().finally(() => prisma.$disconnect());
