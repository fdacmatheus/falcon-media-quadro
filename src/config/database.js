import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.sqlite');

// Verificar se o arquivo existe e tem as permissões corretas
try {
  if (!fs.existsSync(dbPath)) {
    console.error('Arquivo do banco de dados não encontrado:', dbPath);
    process.exit(1);
  }

  // Verificar permissões
  const stats = fs.statSync(dbPath);
  const mode = stats.mode & 0o777;
  console.log('Permissões do arquivo do banco:', mode.toString(8));
} catch (err) {
  console.error('Erro ao verificar arquivo do banco:', err);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    process.exit(1);
  } else {
    console.log('Conectado ao banco de dados SQLite em:', dbPath);
    
    // Habilitar foreign keys e WAL mode para melhor performance
    db.run('PRAGMA foreign_keys = ON');
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA synchronous = NORMAL');
    db.run('PRAGMA busy_timeout = 5000');
  }
});

export const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    console.log('Executando query:', sql);
    console.log('Parâmetros:', params);
    
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Erro na query:', err);
        console.error('SQL:', sql);
        console.error('Parâmetros:', params);
        reject(err);
      } else {
        resolve({ rows });
      }
    });
  });
};

export { db }; 