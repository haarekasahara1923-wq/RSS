/**
 * prisma/clear-data.ts
 * Run with: npx tsx prisma/clear-data.ts
 *
 * Deletes all application data (students, fees, homework, notices, exams, etc.)
 * Keeps Tenant, Subscription, and admin User accounts (SUPER_ADMIN, COACHING_ADMIN).
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🧹 Starting database cleanup...\n')

  // Delete in dependency order (children before parents)

  console.log('  Deleting homework submissions...')
  await prisma.homeworkSubmission.deleteMany({})

  console.log('  Deleting homework...')
  await prisma.homework.deleteMany({})

  console.log('  Deleting exam results...')
  await prisma.examResult.deleteMany({})

  console.log('  Deleting exams...')
  await prisma.exam.deleteMany({})

  console.log('  Deleting notifications...')
  await prisma.notification.deleteMany({})

  console.log('  Deleting attendance records...')
  await prisma.attendance.deleteMany({})

  console.log('  Deleting payments...')
  await prisma.payment.deleteMany({})

  console.log('  Deleting fee records...')
  await prisma.fee.deleteMany({})

  console.log('  Deleting expenses...')
  await prisma.expense.deleteMany({})

  console.log('  Deleting leads...')
  await prisma.lead.deleteMany({})

  console.log('  Deleting mock tests...')
  await prisma.mockTest.deleteMany({})

  console.log('  Deleting parent profiles...')
  await prisma.parentProfile.deleteMany({})

  console.log('  Deleting teachers...')
  await prisma.teacher.deleteMany({})

  console.log('  Deleting students...')
  await prisma.student.deleteMany({})

  console.log('  Deleting batches...')
  await prisma.batch.deleteMany({})

  console.log('  Deleting courses...')
  await prisma.course.deleteMany({})

  // Delete non-admin user accounts
  console.log('  Deleting student/parent/driver/teacher user accounts...')
  await prisma.user.deleteMany({
    where: {
      role: { in: ['STUDENT', 'PARENT', 'DRIVER', 'TEACHER', 'STAFF'] }
    }
  })

  console.log('\n✅ Database cleared successfully!')
  console.log('   ✓ Admin accounts preserved')
  console.log('   ✓ Tenant & subscription preserved')
  console.log('   ✓ All student/fee/homework/exam/notice/lead data removed')
  console.log('\n   App is now fresh — add real data from the dashboard.')
}

main()
  .catch(e => {
    console.error('❌ Cleanup FAILED:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
