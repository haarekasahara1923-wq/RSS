const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT email, role, "isActive" FROM "User"'))
  .then(res => {
    console.log("Users:", res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
