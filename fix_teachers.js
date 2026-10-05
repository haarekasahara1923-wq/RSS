const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({ where: { role: 'TEACHER' }, include: { teacherProfile: true } });
    for (const u of users) {
        if (!u.teacherProfile) {
            const teacher = await prisma.teacher.findFirst({ where: { email: u.email } });
            if (teacher) {
                await prisma.teacher.update({ where: { id: teacher.id }, data: { userId: u.id } });
                console.log('Fixed teacher', u.email);
            }
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
