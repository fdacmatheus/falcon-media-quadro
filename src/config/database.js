import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.sqlite');
console.log('Caminho do banco de dados:', dbPath);

// Verificar se o arquivo existe e tem as permissões corretas
try {
  if (!fs.existsSync(dbPath)) {
    console.error('Arquivo do banco de dados não encontrado:', dbPath);
    // Tentar criar o arquivo do banco se não existir
    try {
      fs.writeFileSync(dbPath, '', { mode: 0o666 });
      console.log('Arquivo do banco de dados criado com permissões 666');
    } catch (createErr) {
      console.error('Erro ao criar arquivo do banco:', createErr);
      process.exit(1);
    }
  }

  // Verificar permissões
  const stats = fs.statSync(dbPath);
  const mode = stats.mode & 0o777;
  console.log('Permissões do arquivo do banco:', mode.toString(8));
  
  // Verificar permissões de escrita
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

// Testar escrita no diretório
try {
  const testDir = path.dirname(dbPath);
  const testWritePath = path.join(testDir, '.db_write_test');
  fs.writeFileSync(testWritePath, 'test');
  fs.unlinkSync(testWritePath);
  console.log('Permissões de escrita no diretório do banco: OK');
} catch (writeErr) {
  console.error('AVISO: Sem permissão de escrita no diretório do banco:', writeErr);
}

// Inicializar a conexão
let db;
try {
  // Configurar SQLite com WAL para evitar problemas de bloqueio
  sqlite3.verbose();
  
  db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
      console.error('Erro ao conectar ao banco de dados:', err);
      process.exit(1);
    } else {
      console.log('Conectado ao banco de dados SQLite em:', dbPath);
      
      // Habilitar foreign keys e WAL mode para melhor performance
      db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA synchronous = NORMAL');
        db.run('PRAGMA busy_timeout = 5000');
        db.run('PRAGMA temp_store = MEMORY');
        
        // Testar a conexão com uma query simples
        db.get('SELECT 1 as test', [], function(testErr, row) {
          if (testErr) {
            console.error('Erro ao testar conexão:', testErr);
          } else {
            console.log('Conexão testada com sucesso:', row);
          }
        });
      });
    }
  });
} catch (initErr) {
  console.error('Erro crítico ao inicializar banco de dados:', initErr);
  process.exit(1);
}

// Função para executar queries com retry em caso de SQLITE_BUSY
export const query = (sql, params = []) => {
  const maxRetries = 3;
  
  const executeQuery = (retryCount = 0) => {
    return new Promise((resolve, reject) => {
      console.log(`Executando query (tentativa ${retryCount + 1}/${maxRetries + 1}):`, sql);
      console.log('Parâmetros:', params);
      
      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Erro na query:', err);
          console.error('SQL:', sql);
          console.error('Parâmetros:', params);
          
          // Se for erro de banco ocupado (SQLITE_BUSY) e ainda temos tentativas
          if (err.code === 'SQLITE_BUSY' && retryCount < maxRetries) {
            console.log(`Banco ocupado, tentando novamente em ${500 * (retryCount + 1)}ms...`);
            setTimeout(() => {
              executeQuery(retryCount + 1)
                .then(resolve)
                .catch(reject);
            }, 500 * (retryCount + 1));
          } else {
            reject(err);
          }
        } else {
          console.log(`Query executada com sucesso. Resultados: ${rows ? rows.length : 0}`);
          resolve({ rows });
        }
      });
    });
  };
  
  return executeQuery();
};

export { db }; 