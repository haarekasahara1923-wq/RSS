import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pg from 'pg'
const { Pool } = pg

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  const r = await pool.query(
    'INSERT INTO "Tenant" (id,name,slug,"themeColor",address,phone,email,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) ON CONFLICT (slug) DO UPDATE SET name=$2,"themeColor"=$4,address=$5,phone=$6,email=$7 RETURNING id',
    ['tenant_udba','Universal Day Boarding Academy','udba','#1a5c38','Pinto Park, Gwalior (MP)','917879337770','info@udba.space']
  )
  const tid = r.rows[0].id
  console.log('Tenant:', tid)
  const sp = await bcrypt.hash('udba@super2026', 10)
  await pool.query('INSERT INTO "User" (id,"tenantId",email,phone,password,name,role,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) ON CONFLICT ("tenantId",email) DO UPDATE SET password=$5,name=$6',
    ['user_udba_super',tid,'superadmin@udba.space','917879337770',sp,'UDBA Super Admin','SUPER_ADMIN'])
  const ap = await bcrypt.hash('udba@admin2026', 10)
  await pool.query('INSERT INTO "User" (id,"tenantId",email,phone,password,name,role,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) ON CONFLICT ("tenantId",email) DO UPDATE SET password=$5,name=$6',
    ['user_udba_admin',tid,'admin@udba.space','917879337770',ap,'School Administrator','COACHING_ADMIN'])
  const tp = await bcrypt.hash('teacher@udba2026', 10)
  await pool.query('INSERT INTO "User" (id,"tenantId",email,phone,password,name,role,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) ON CONFLICT ("tenantId",email) DO UPDATE SET password=$5,name=$6',
    ['user_udba_teacher',tid,'teacher@udba.space','9876543211',tp,'Demo Teacher','TEACHER'])
  console.log('Users OK')
  const courses = [
    ['course_udba_1','Class 6','Std 6','1 Year',12000,'{Hindi,English,Maths,Science}'],
    ['course_udba_2','Class 7','Std 7','1 Year',12000,'{Hindi,English,Maths,Science}'],
    ['course_udba_3','Class 8','Std 8','1 Year',13000,'{Hindi,English,Maths,Science}'],
    ['course_udba_4','Class 9','Std 9','1 Year',15000,'{Hindi,English,Maths,Science}'],
    ['course_udba_5','Class 10','Std 10','1 Year',18000,'{Hindi,English,Maths,Science}'],
    ['course_udba_6','Class 11 Sci','Sci 11','1 Year',22000,'{Physics,Chemistry,Maths}'],
    ['course_udba_7','Class 12 Sci','Sci 12','1 Year',24000,'{Physics,Chemistry,Maths}'],
    ['course_udba_8','Class 11 Com','Com 11','1 Year',20000,'{Accountancy,Economics}'],
    ['course_udba_9','Class 12 Com','Com 12','1 Year',22000,'{Accountancy,Economics}'],
  ]
  for (const c of courses) {
    await pool.query('INSERT INTO "Course" (id,"tenantId",name,description,duration,fees,subjects,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) ON CONFLICT DO NOTHING',
      [c[0],tid,c[1],c[2],c[3],c[4],c[5]])
  }
  console.log('Courses OK')
  const batches = [
    ['batch_udba_1','course_udba_1','Class 6-A','08:00','14:00',40],
    ['batch_udba_2','course_udba_2','Class 7-A','08:00','14:00',40],
    ['batch_udba_3','course_udba_3','Class 8-A','08:00','14:00',40],
    ['batch_udba_4','course_udba_4','Class 9-A','08:00','14:00',40],
    ['batch_udba_5','course_udba_5','Class 10-A','08:00','14:00',40],
    ['batch_udba_6','course_udba_6','Class 11 Sci','08:00','14:30',35],
    ['batch_udba_7','course_udba_7','Class 12 Sci','08:00','14:30',35],
    ['batch_udba_8','course_udba_8','Class 11 Com','08:00','14:00',35],
    ['batch_udba_9','course_udba_9','Class 12 Com','08:00','14:00',35],
  ]
  for (const b of batches) {
    await pool.query('INSERT INTO "Batch" (id,"tenantId","courseId",name,"startTime","endTime",capacity,"isActive","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,true,NOW(),NOW()) ON CONFLICT DO NOTHING',
      [b[0],tid,b[1],b[2],b[3],b[4],b[5]])
  }
  console.log('Batches OK')
  const studs = [
    ['stu_udba_1','Arjun Sharma','9876501001','Ramesh Sharma','course_udba_5','batch_udba_5',18000,9000,'UDBA001'],
    ['stu_udba_2','Priya Verma','9876502001','Suresh Verma','course_udba_7','batch_udba_7',24000,24000,'UDBA002'],
    ['stu_udba_3','Rahul Gupta','9876503001','Mahesh Gupta','course_udba_4','batch_udba_4',15000,7500,'UDBA003'],
  ]
  for (const s of studs) {
    await pool.query('INSERT INTO "Student" (id,"tenantId","courseId","batchId","studentId","fullName","fatherName",phone,gender,"totalFee","paidFee",status,"admissionDate","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW(),NOW()) ON CONFLICT DO NOTHING',
      [s[0],tid,s[4],s[5],s[8],s[1],s[3],s[2],'MALE',s[6],s[7],'ACTIVE'])
  }
  console.log('Students OK')
  await pool.query('INSERT INTO "Subscription" (id,"tenantId",plan,status,amount,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW(),NOW()) ON CONFLICT ("tenantId") DO UPDATE SET plan=$3,status=$4',
    ['sub_udba',tid,'ELITE','ACTIVE',0])
  console.log('Subscription OK')
  await pool.end()
  console.log('')
  console.log('=== UDBA SEED COMPLETE ===')
  console.log('superadmin@udba.space / udba@super2026')
  console.log('admin@udba.space / udba@admin2026')
  console.log('teacher@udba.space / teacher@udba2026')
  console.log('NEXT_PUBLIC_SCHOOL_TENANT_ID=' + tid)
}
main().catch(e => { console.error('SEED FAILED:', e.message); process.exit(1) })
