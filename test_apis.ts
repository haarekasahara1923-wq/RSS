import { prisma } from './src/lib/prisma';
async function testAPI() {
    try {
        const teacherId = 'cmuve0mac0000jkuieivm3st7'; // from dump
        const tenantId = 'cmunljxc7000004jwo5xs35jb';
        
        console.log('Testing attendance...');
        const att = await prisma.attendance.findMany({
            where: { tenantId, teacherId },
            include: { teacher: { select: { id: true, name: true, photo: true } } },
            orderBy: { date: 'desc' }
        });
        console.log('Attendance:', att.length);
        
        console.log('Testing leave...');
        const leaves = await prisma.leaveApplication.findMany({
            where: { tenantId, teacherId },
            include: { teacher: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Leaves:', leaves.length);
        
        console.log('Testing salary...');
        const salary = await prisma.teacherSalaryLedger.findMany({
            where: { tenantId, teacherId },
            orderBy: { createdAt: 'desc' }
        });
        console.log('Salary:', salary.length);

        console.log('Testing timetable...');
        const tt = await prisma.timeTable.findMany({
            where: { tenantId, teacherId },
            include: { course: true, batch: true, teacher: true }
        });
        console.log('Timetable:', tt.length);

    } catch (e) {
        console.error('ERROR:', e);
    }
}
testAPI().finally(() => prisma.$disconnect());
