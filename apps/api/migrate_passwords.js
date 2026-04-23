#!/usr/bin/env node
/**
 * Password Migration Script
 * 
 * This script migrates existing plaintext passwords to bcrypt hashes.
 * Run this once after deploying the security fixes.
 * 
 * Usage: node migrate_passwords.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 12;

// Database connection - uses same env vars as server
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'peopletracker',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function migratePasswords() {
  console.log('Starting password migration...');
  
  try {
    // Get all users
    const usersResult = await pool.query('SELECT id, username, password_hash FROM users');
    console.log(`Found ${usersResult.rows.length} users to check`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const user of usersResult.rows) {
      try {
        // Check if password is already hashed (bcrypt hashes start with $2)
        if (user.password_hash.startsWith('$2')) {
          console.log(`  [SKIP] ${user.username}: Already hashed`);
          skipped++;
          continue;
        }
        
        // Hash the plaintext password
        const newHash = await bcrypt.hash(user.password_hash, BCRYPT_ROUNDS);
        
        // Update the database
        await pool.query(
          'UPDATE users SET password_hash = $1 WHERE id = $2',
          [newHash, user.id]
        );
        
        console.log(`  [MIGRATED] ${user.username}: Plaintext → bcrypt`);
        migrated++;
        
      } catch (err) {
        console.error(`  [ERROR] ${user.username}: ${err.message}`);
        errors++;
      }
    }
    
    console.log('\nMigration complete!');
    console.log(`  Migrated: ${migrated}`);
    console.log(`  Skipped (already hashed): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    
    if (migrated > 0) {
      console.log('\nIMPORTANT: All users with migrated passwords should be notified');
      console.log('to reset their passwords for enhanced security.');
    }
    
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  migratePasswords();
}

module.exports = { migratePasswords };
