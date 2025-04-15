const fs = require('fs').promises;
const path = require('path');

async function checkVideoFileExists(filePath) {
  try {
    // Remover o prefixo /api/videos/ se existir
    const cleanPath = filePath.replace('/api/videos/', '');
    
    // Construir o caminho completo para o arquivo
    const fullPath = path.join(process.cwd(), 'public', 'uploads', cleanPath);
    
    // Verificar se o arquivo existe
    await fs.access(fullPath);
    return true;
  } catch (error) {
    console.error('Erro ao verificar arquivo de vídeo:', error);
    return false;
  }
}

module.exports = {
  checkVideoFileExists
}; 