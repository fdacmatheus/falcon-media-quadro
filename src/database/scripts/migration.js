import pkg from 'sqlite3';
const { Database } = pkg;
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Conectar ao banco de dados
const dbPath = path.join(__dirname, '..', '..', '..', 'database.sqlite');
console.log('Caminho do banco de dados:', dbPath);

// Verificar se o banco de dados existe
if (!fs.existsSync(dbPath)) {
  console.error('Banco de dados não encontrado:', dbPath);
  process.exit(1);
}

// Conectar ao banco de dados
const db = new Database(dbPath);

// Função para executar consultas com promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        console.error('Erro ao executar SQL:', sql);
        console.error('Parâmetros:', params);
        console.error('Erro:', err);
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

// Função para verificar se uma coluna existe
const columnExists = (table, column) => {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      
      const columnExists = rows.some(row => row.name === column);
      resolve(columnExists);
    });
  });
};

// Executar migrações
const runMigrations = async () => {
  try {
    console.log('Iniciando migrações...');
    
    // Verificar se a coluna version_id existe na tabela comments
    const versionIdExists = await columnExists('comments', 'version_id');
    
    if (!versionIdExists) {
      console.log('Adicionando coluna version_id à tabela comments...');
      
      // Adicionar coluna version_id
      await run('ALTER TABLE comments ADD COLUMN version_id TEXT');
      
      // Adicionar foreign key através de um índice
      await run('CREATE INDEX IF NOT EXISTS idx_comments_version_id ON comments(version_id)');
      
      console.log('Coluna version_id adicionada com sucesso!');
    } else {
      console.log('Coluna version_id já existe na tabela comments.');
    }
    
    console.log('Migrações concluídas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro durante migrações:', error);
    process.exit(1);
  }
};

// Iniciar migrações
runMigrations(); 