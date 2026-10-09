const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get a valid tenantId and courseId first
  const tenant = await prisma.tenant.findFirst({ where: { slug: 'rsspublicschool' } });
  if (!tenant) {
    console.error('Tenant not found');
    return;
  }
  console.log('Tenant found:', tenant.id);
  
  const course = await prisma.course.findFirst({ where: { tenantId: tenant.id } });
  if (!course) {
    console.error('Course not found');
    return;
  }
  console.log('Course found:', course.id, course.name);

  // Test create student without batchId
  try {
    const student = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        courseId: course.id,
        batchId: undefined, // No batch - was failing before!
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
    console.log('✅ SUCCESS! Student created:', student.id);
    
    // Cleanup
    await prisma.student.delete({ where: { id: student.id } });
    console.log('✅ Cleanup done. Error is FIXED!');
  } catch (e) {
    console.error('❌ Still failing:', e.message);
  }
  
  await prisma.$disconnect();
}

main();
