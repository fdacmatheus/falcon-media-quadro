const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(process.cwd(), 'database.sqlite');

function runMigration() {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    // Verificar se a coluna já existe
    db.get("PRAGMA table_info(comments)", (err, rows) => {
      if (err) {
        console.error('Erro ao verificar estrutura da tabela:', err);
        return;
      }

      // Adicionar a coluna version_id se ela não existir
      db.run(`
        ALTER TABLE comments 
        ADD COLUMN version_id TEXT
      `, (err) => {
        if (err) {
          // Se o erro for porque a coluna já existe, podemos ignorar
          if (!err.message.includes('duplicate column name')) {
            console.error('Erro ao adicionar coluna version_id:', err);
          }
        } else {
          console.log('Coluna version_id adicionada com sucesso');
        }

        // Criar índice para melhorar performance
        db.run(`
          CREATE INDEX IF NOT EXISTS idx_comments_version_id 
          ON comments(version_id)
        `, (err) => {
          if (err) {
            console.error('Erro ao criar índice:', err);
          } else {
            console.log('Índice criado com sucesso');
          }
        });
      });
    });
  });

  db.close();
}

runMigration(); 