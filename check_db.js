const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT id, slug, name FROM "Tenant"'))
  .then(res => {
    console.log("Tenants:", res.rows);
    return client.query('SELECT id, email, phone, role, "tenantId" FROM "User"');
  })
  .then(res => {
    console.log("Users:", res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
