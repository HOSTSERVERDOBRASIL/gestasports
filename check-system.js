#!/usr/bin/env node
/**
 * 🚀 Flamilha - Verificação de Status do Sistema
 * Execute com: node check-system.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════╗');
console.log('║     Flamilha - Verificação de Status   ║');
console.log('╚════════════════════════════════════════╝\n');

const checks = [];

// 1. Node.js
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  checks.push({ name: 'Node.js', status: '✅', detail: nodeVersion });
} catch {
  checks.push({ name: 'Node.js', status: '❌', detail: 'Não encontrado' });
}

// 2. npm
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  checks.push({ name: 'npm', status: '✅', detail: `v${npmVersion}` });
} catch {
  checks.push({ name: 'npm', status: '❌', detail: 'Não encontrado' });
}

// 3. Docker
try {
  execSync('docker --version', { encoding: 'utf-8' });
  checks.push({ name: 'Docker', status: '✅', detail: 'Instalado' });
} catch {
  checks.push({ name: 'Docker', status: '⚠️', detail: 'Não está rodando' });
}

// 4. Dependencies Backend
try {
  const files = fs.readdirSync('node_modules/@prisma');
  checks.push({ name: 'Dependências Backend', status: '✅', detail: 'Instaladas' });
} catch {
  checks.push({ name: 'Dependências Backend', status: '❌', detail: 'Não instaladas' });
}

// 5. Dependencies Frontend
try {
  const files = fs.readdirSync('frontend/node_modules/react');
  checks.push({ name: 'Dependências Frontend', status: '✅', detail: 'Instaladas' });
} catch {
  checks.push({ name: 'Dependências Frontend', status: '❌', detail: 'Não instaladas' });
}

// 6. .env
try {
  if (fs.existsSync('.env')) {
    checks.push({ name: 'Arquivo .env', status: '✅', detail: 'Configurado' });
  }
} catch {
  checks.push({ name: 'Arquivo .env', status: '❌', detail: 'Não encontrado' });
}

// 7. Prisma Schema
try {
  if (fs.existsSync('prisma/schema.prisma')) {
    checks.push({ name: 'Schema Prisma', status: '✅', detail: 'OK' });
  }
} catch {
  checks.push({ name: 'Schema Prisma', status: '❌', detail: 'Não encontrado' });
}

// Print results
checks.forEach(check => {
  console.log(`${check.status} ${check.name.padEnd(25)} ${check.detail}`);
});

console.log('\n╔════════════════════════════════════════╗');
console.log('║        Próximas Etapas                 ║');
console.log('╚════════════════════════════════════════╝\n');

console.log('1️⃣  Abra Docker Desktop (Menu Iniciar → Docker)');
console.log('2️⃣  Aguarde aparecer ✓ na bandeja (30 segundos)');
console.log('3️⃣  Execute: powershell -ExecutionPolicy Bypass -File INIT.ps1\n');
console.log('Ou use: Ctrl+Shift+P → Tasks: Run Task → 🚀 Inicializar\n');
