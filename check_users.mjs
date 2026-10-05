import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({ select: { id: true, email: true, phone: true, role: true, tenantId: true } });
    console.log(users);
}
main().finally(() => prisma.$disconnect());
