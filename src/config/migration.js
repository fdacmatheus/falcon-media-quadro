import { db } from './database.js';
import fs from 'fs';
import path from 'path';

// Caminho para o arquivo de esquema SQL
const schemaPath = path.join(process.cwd(), 'schema.sql');

// Função para aplicar o esquema SQL
async function applySchema() {
  return new Promise((resolve, reject) => {
    // Ler o conteúdo do arquivo de esquema
    fs.readFile(schemaPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Erro ao ler arquivo de esquema:', err);
        reject(err);
        return;
      }

      // Executar as consultas SQL do esquema
      db.exec(data, (execErr) => {
        if (execErr) {
          console.error('Erro ao executar esquema SQL:', execErr);
          reject(execErr);
          return;
        }

        console.log('Esquema SQL aplicado com sucesso!');
        resolve();
      });
    });
  });
}

// Executar a migração
applySchema()
  .then(() => {
    console.log('Migração concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Erro durante a migração:', error);
    process.exit(1);
  }); 