import { prisma } from './src/lib/prisma';
async function fixAll() {
    const users = await prisma.user.findMany({ where: { role: 'TEACHER' }, include: { teacherProfile: true } });
    for (const u of users) {
        if (!u.teacherProfile) {
            let teacher = await prisma.teacher.findFirst({
                where: {
                    OR: [
                        { email: u.email },
                        { phone: u.phone || u.email.split('@')[0] }
                    ]
                }
            });
            if (teacher) {
                await prisma.teacher.update({ where: { id: teacher.id }, data: { userId: u.id } });
                console.log(`Linked existing teacher to user ${u.email}`);
            } else {
                console.log(`Creating missing teacher profile for ${u.email}`);
                await prisma.teacher.create({
                    data: {
                        tenantId: u.tenantId,
                        userId: u.id,
                        name: u.name,
                        email: u.email,
                        phone: u.phone || u.email.split('@')[0] || "",
                        subject: [],
                        salary: 0,
                        isActive: true
                    }
                });
                console.log(`Created new teacher profile for user ${u.email}`);
            }
        }
    }
}
fixAll().finally(() => prisma.$disconnect());
