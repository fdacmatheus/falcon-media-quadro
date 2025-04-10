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
  
  // Verificar permissões de escrita
  try {
    const testWritePath = path.join(process.cwd(), '.db_write_test');
    fs.writeFileSync(testWritePath, 'test');
    fs.unlinkSync(testWritePath);
    console.log('Permissões de escrita no diretório: OK');
  } catch (writeErr) {
    console.error('AVISO: Sem permissão de escrita no diretório:', writeErr);
  }
  
  // Tentar garantir que o banco tenha permissões de escrita
  try {
    fs.accessSync(dbPath, fs.constants.W_OK);
    console.log('Permissões de escrita no banco de dados: OK');
  } catch (accessErr) {
    console.error('ERRO: Sem permissão de escrita no banco de dados!', accessErr);
    // Tentar corrigir as permissões
    try {
      fs.chmodSync(dbPath, 0o666);
      console.log('Permissões do banco de dados atualizadas para: 666');
    } catch (chmodErr) {
      console.error('Falha ao atualizar permissões do banco:', chmodErr);
    }
  }
} catch (err) {
  console.error('Erro ao verificar arquivo do banco:', err);
  process.exit(1);
}

// Função para conectar ao banco com tentativas
const connectWithRetry = (attempts = 5, delay = 1000) => {
  console.log(`Tentativa ${6-attempts} de conexão ao banco de dados...`);
  
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        
        if (attempts <= 1) {
          console.error('Número máximo de tentativas excedido.');
          reject(err);
          return;
        }
        
        setTimeout(() => {
          connectWithRetry(attempts - 1, delay)
            .then(resolve)
            .catch(reject);
        }, delay);
      } else {
        console.log('Conectado ao banco de dados SQLite em:', dbPath);
        
        // Habilitar foreign keys e WAL mode para melhor performance
        db.run('PRAGMA foreign_keys = ON');
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA busy_timeout = 5000');
        
        // Testar a conexão com uma query simples
        db.get('SELECT 1 as test', [], function(testErr, row) {
          if (testErr) {
            console.error('Erro ao testar conexão:', testErr);
            reject(testErr);
          } else {
            console.log('Conexão testada com sucesso:', row);
            resolve(db);
          }
        });
      }
    });
  });
};

// Inicializar a conexão
let db;
try {
  db = new sqlite3.Database(dbPath, (err) => {
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
} catch (initErr) {
  console.error('Erro crítico ao inicializar banco de dados:', initErr);
  process.exit(1);
}

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
        console.log(`Query executada com sucesso. Resultados: ${rows ? rows.length : 0}`);
        resolve({ rows });
      }
    });
  });
};

export { db }; 