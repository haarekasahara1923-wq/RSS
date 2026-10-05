import { prisma } from './src/lib/prisma';
async function test() {
    const user1 = await prisma.user.findFirst({ where: { email: '7477004474@udba.local' } });
    console.log('User1:', user1);
    const user2 = await prisma.user.findFirst({ where: { email: '8602500149@udba.local' } });
    console.log('User2:', user2);
    const t = await prisma.teacher.findMany();
    console.log('All Teachers:', JSON.stringify(t, null, 2));
}
test().finally(() => prisma.$disconnect());
