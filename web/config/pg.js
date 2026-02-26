import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const pool = new Pool({
<<<<<<< HEAD
  connectionString: process.env.PG_URL,
  // ⚡️ CRITICAL: Render & AWS RDS require SSL
  ssl: {
    rejectUnauthorized: false 
  }
=======
    connectionString: process.env.PG_URL_IPV6,
    rejectUnauthorized: false
>>>>>>> c920838 (Changes)
});

// Test the connection immediately on boot
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Database Connection Failed:', err.stack);
  }
  console.log('✅ Connected to Database');
  release();
});

export default pool;
