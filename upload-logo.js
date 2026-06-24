#!/usr/bin/env node
/**
 * 🖼️ Flamilha - Upload de Logo
 * Execute: node upload-logo.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { existsSync, mkdirSync } = require('fs');

const PORT = 9999;
const UPLOAD_DIR = path.join(__dirname, 'frontend', 'public', 'brand');

// Criar diretório se não existir
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Upload Logo Flamilha</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 500px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    h1 {
      color: #dc2626;
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .upload-area {
      border: 2px dashed #dc2626;
      border-radius: 12px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      background: #fef2f2;
    }
    .upload-area:hover {
      border-color: #991b1b;
      background: #fee2e2;
    }
    .upload-area.active {
      border-color: #991b1b;
      background: #fecaca;
      transform: scale(1.02);
    }
    .upload-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .upload-text {
      color: #374151;
      font-weight: 500;
      margin-bottom: 5px;
    }
    .upload-subtext {
      color: #6b7280;
      font-size: 12px;
    }
    input[type="file"] {
      display: none;
    }
    .button-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    button {
      flex: 1;
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 14px;
    }
    .btn-select {
      background: #dc2626;
      color: white;
    }
    .btn-select:hover {
      background: #991b1b;
    }
    .status {
      margin-top: 20px;
      padding: 15px;
      border-radius: 8px;
      display: none;
      font-size: 14px;
    }
    .status.success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
      display: block;
    }
    .status.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
      display: block;
    }
    .status.loading {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
      display: block;
    }
    .preview {
      margin-top: 20px;
      display: none;
    }
    .preview.show {
      display: block;
    }
    .preview img {
      max-width: 100%;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .info {
      background: #f3f4f6;
      padding: 15px;
      border-radius: 8px;
      margin-top: 20px;
      font-size: 12px;
      color: #666;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🖼️ Upload da Logo Flamilha</h1>
    <p class="subtitle">Substitua a logo em todos os ambientes</p>

    <div class="upload-area" id="uploadArea">
      <div class="upload-icon">📁</div>
      <div class="upload-text">Arraste a imagem aqui</div>
      <div class="upload-subtext">ou clique para selecionar</div>
    </div>

    <div class="button-group">
      <button class="btn-select" onclick="selectFile()">Selecionar Arquivo</button>
    </div>

    <div class="preview" id="preview">
      <img id="previewImg" src="" alt="Preview">
    </div>

    <div class="status" id="status"></div>

    <div class="info">
      <strong>ℹ️ Informações:</strong><br>
      • Formato: PNG, JPG, SVG<br>
      • Tamanho máximo: 5MB<br>
      • Recomendado: 512x512px ou maior<br>
      • Será usado em: Login, Convite, Favicon
    </div>
  </div>

  <input type="file" id="fileInput" accept="image/*">

  <script>
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const statusDiv = document.getElementById('status');
    const previewDiv = document.getElementById('preview');
    const previewImg = document.getElementById('previewImg');

    function selectFile() {
      fileInput.click();
    }

    uploadArea.addEventListener('click', selectFile);

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('active');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('active');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('active');
      const files = e.dataTransfer.files;
      if (files.length) handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFile(e.target.files[0]);
    });

    function handleFile(file) {
      // Validações
      if (!file.type.startsWith('image/')) {
        showStatus('Selecione um arquivo de imagem válido!', 'error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showStatus('Arquivo muito grande! Máximo 5MB.', 'error');
        return;
      }

      // Preview
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImg.src = e.target.result;
        previewDiv.classList.add('show');
      };
      reader.readAsDataURL(file);

      // Upload
      const formData = new FormData();
      formData.append('file', file);

      showStatus('Enviando...', 'loading');

      fetch('/upload', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showStatus('✅ Logo atualizada com sucesso em todos os ambientes!', 'success');
          setTimeout(() => {
            location.reload();
          }, 2000);
        } else {
          showStatus('❌ Erro: ' + (data.error || 'Falha ao fazer upload'), 'error');
        }
      })
      .catch(err => {
        showStatus('❌ Erro na conexão: ' + err.message, 'error');
      });
    }

    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = 'status ' + type;
    }
  </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
  if (req.url === '/' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else if (req.url === '/upload' && req.method === 'POST') {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    let data = '';

    req.on('data', chunk => {
      data += chunk;
    });

    req.on('end', () => {
      try {
        const parts = data.split('--' + boundary);
        let fileData = null;
        let fileName = 'flamilha-logo.png';

        for (const part of parts) {
          if (part.includes('filename=')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            if (filenameMatch) {
              fileName = filenameMatch[1];
              const binaryStart = part.indexOf('\r\n\r\n') + 4;
              const binaryEnd = part.lastIndexOf('\r\n');
              fileData = part.slice(binaryStart, binaryEnd);
            }
          }
        }

        if (fileData) {
          const ext = path.extname(fileName);
          const savePath = path.join(UPLOAD_DIR, 'flamilha-logo' + (ext || '.png'));

          fs.writeFileSync(savePath, Buffer.from(fileData, 'binary'));

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Logo atualizada com sucesso!',
            path: savePath
          }));

          console.log('✅ Logo salva em:', savePath);
        } else {
          throw new Error('Arquivo não encontrado no upload');
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err.message
        }));

        console.error('❌ Erro:', err.message);
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  🖼️  Upload de Logo Flamilha          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('');
  console.log('📍 Abra no navegador:');
  console.log('   👉 http://localhost:' + PORT);
  console.log('');
  console.log('📁 Salva em:');
  console.log('   ' + UPLOAD_DIR);
  console.log('');
  console.log('⏹️  Pressione Ctrl+C para sair');
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\n\n✅ Servidor encerrado');
  process.exit(0);
});
