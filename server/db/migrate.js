import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, 'migrations');

// Create migrations table if it doesn't exist
const createMigrationsTable = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } finally {
    client.release();
  }
};

// Get applied migrations
const getAppliedMigrations = async () => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT name FROM migrations ORDER BY id');
    return result.rows.map(row => row.name);
  } finally {
    client.release();
  }
};

// Apply a migration
const applyMigration = async (name, sql) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Apply the migration
    await client.query(sql);
    
    // Record the migration
    await client.query(
      'INSERT INTO migrations (name) VALUES ($1)',
      [name]
    );
    
    await client.query('COMMIT');
    console.log(`Applied migration: ${name}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error applying migration ${name}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migrations
const runMigrations = async () => {
  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get applied migrations
    const appliedMigrations = await getAppliedMigrations();
    
    // Get migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    // Apply pending migrations
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        await applyMigration(file, sql);
      }
    }
    
    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run migrations
runMigrations();