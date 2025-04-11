import { db } from './database.js';

// SQL to add is_hidden column to videos table if it doesn't exist
const sqlAlterTable = `
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Check if the is_hidden column exists
SELECT name FROM pragma_table_info('videos') WHERE name='is_hidden';

-- If it doesn't exist, add it
ALTER TABLE videos ADD COLUMN is_hidden INTEGER DEFAULT 0;

COMMIT;

PRAGMA foreign_keys=on;
`;

// Execute the SQL
db.exec(sqlAlterTable, (error) => {
  if (error) {
    console.error('Error adding is_hidden column:', error);
    process.exit(1);
  } else {
    console.log('Database schema updated successfully - added is_hidden column to videos table');
    process.exit(0);
  }
}); 