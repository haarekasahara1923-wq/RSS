import { prisma } from './src/lib/prisma';
async function test() {
    const user = await prisma.user.findFirst({
        where: { email: '7477004474@udba.local' },
        include: { teacherProfile: true }
    });
    console.log(JSON.stringify(user, null, 2));
}
test().finally(() => { prisma.$disconnect(); });
