import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // First get any tenant
  const tenants = await prisma.tenant.findMany({ take: 3, select: { id: true, name: true, slug: true } });
  console.log('Available tenants:', tenants);
  
  if (tenants.length === 0) {
    console.error('No tenants found!');
    return;
  }
  
  const tenant = tenants[0];
  console.log('Using tenant:', tenant.id);
  
  const course = await prisma.course.findFirst({ where: { tenantId: tenant.id } });
  if (!course) { console.error('Course not found'); return; }
  console.log('Course:', course.name);

  try {
    const student = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        courseId: course.id,
        studentId: 'TEST-999',
        fullName: 'Test Student Fix',
        phone: '9999999998',
        gender: 'MALE',
        admissionDate: new Date(),
        totalFee: 0,
        paidFee: 0,
        status: 'ACTIVE',
        scholarNo: 'TEST-SCH-999',
        fatherName: 'Test Father',
      }
    });
    console.log('\n✅ SUCCESS! Student created without batchId:', student.id);
    await prisma.student.delete({ where: { id: student.id } });
    console.log('✅ Cleanup done. batchId constraint error is FIXED!');
  } catch (e: any) {
    console.error('\n❌ Still failing:', e.message);
  }
  
  await prisma.$disconnect();
  await pool.end();
}

main();
