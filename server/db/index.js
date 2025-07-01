import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database connection
export const initDb = async () => {
  try {
    // Test database connection
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      console.log('Database connected:', result.rows[0].now);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Query helper function
export const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Transaction helper function
export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export { pool };