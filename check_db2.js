const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query('SELECT * FROM "Student"'))
  .then(res => {
    console.log("Students:", res.rows);
    client.end();
  })
  .catch(err => {
    console.error(err);
    client.end();
  });
