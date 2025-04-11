const fs = require('fs');
const path = require('path');
const { db } = require('../../database/config/database');

// Ler o arquivo schema.sql
const schema = fs.readFileSync(path.join(__dirname, '../../../schema.sql'), 'utf8');

// Separar os comandos por tipo
const tables = [];
const indexes = [];
const triggers = [];

// Processar cada comando
let currentCommand = '';
schema.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  
  // Ignorar linhas vazias e comentários
  if (!trimmedLine || trimmedLine.startsWith('--')) {
    return;
  }

  currentCommand += line + '\n';

  if (line.endsWith(';')) {
    if (currentCommand.includes('CREATE TABLE')) {
      tables.push(currentCommand);
    } else if (currentCommand.includes('CREATE INDEX')) {
      indexes.push(currentCommand);
    } else if (currentCommand.includes('CREATE TRIGGER')) {
      triggers.push(currentCommand);
    }
    currentCommand = '';
  }
});

// Executar os comandos em ordem
db.serialize(() => {
  // Primeiro criar as tabelas
  tables.forEach(cmd => {
    db.run(cmd, (err) => {
      if (err) {
        console.error('Erro ao criar tabela:', err);
      } else {
        console.log('Tabela criada com sucesso');
      }
    });
  });

  // Depois criar os índices
  indexes.forEach(cmd => {
    db.run(cmd, (err) => {
      if (err) {
        console.error('Erro ao criar índice:', err);
      } else {
        console.log('Índice criado com sucesso');
      }
    });
  });

  // Por último criar os triggers
  triggers.forEach(cmd => {
    db.run(cmd, (err) => {
      if (err) {
        console.error('Erro ao criar trigger:', err);
      } else {
        console.log('Trigger criado com sucesso');
      }
    });
  });
});

console.log('Banco de dados inicializado com sucesso!'); 