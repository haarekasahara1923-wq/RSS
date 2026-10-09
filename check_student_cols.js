const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://neondb_owner:npg_SMFX1qf4KHvd@ep-jolly-credit-b7s6eglu.c-13.us-east-1.aws.neon.tech/neondb?sslmode=require"
});

async function main() {
  await client.connect();
  
  // Check Student table columns in the actual DB
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Student'
    ORDER BY ordinal_position;
  `);
  
  console.log('Student table columns in DB:');
  console.table(res.rows);
  
  // Check constraints
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = '"Student"'::regclass;
  `);
  console.log('\nConstraints:');
  console.table(constraints.rows);
  
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
