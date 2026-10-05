import { prisma } from './src/lib/prisma';
async function test() {
    const users = await prisma.user.findMany({
        where: { phone: '7477004474' }
    });
    console.log(users.map(u => ({ id: u.id, role: u.role, email: u.email, phone: u.phone })));
    
    const users2 = await prisma.user.findMany({
        where: { phone: '8602500149' }
    });
    console.log(users2.map(u => ({ id: u.id, role: u.role, email: u.email, phone: u.phone })));
}
test().finally(() => { prisma.$disconnect(); });
