import { prisma } from './src/lib/prisma';
async function fix() {
    const users = await prisma.user.findMany({ where: { role: 'TEACHER' }, include: { teacherProfile: true } });
    for (const u of users) {
        if (!u.teacherProfile) {
            // Find teacher by email OR phone
            const teacher = await prisma.teacher.findFirst({
                where: {
                    OR: [
                        { email: u.email },
                        { phone: u.phone || u.email.split('@')[0] }
                    ]
                }
            });
            if (teacher) {
                await prisma.teacher.update({ where: { id: teacher.id }, data: { userId: u.id } });
                console.log(`Linked teacher ${teacher.name} to user ${u.email}`);
            } else {
                console.log(`WARNING: Could not find Teacher record for user ${u.email}`);
            }
        }
    }
}
fix().finally(() => prisma.$disconnect());
