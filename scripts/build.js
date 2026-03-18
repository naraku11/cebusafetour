/**
 * Build script — runs during Hostinger deployment
 * 1. Installs client (React) dependencies
 * 2. Builds React admin panel (Vite)
 * 3. Copies client/dist → public/ (served as static files by Express)
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '../client');
const distDir   = path.join(clientDir, 'dist');
const publicDir = path.join(__dirname, '../public');

// 1. Install client deps
console.log('[build] Installing client dependencies...');
execSync('npm install', { cwd: clientDir, stdio: 'inherit' });

// 2. Build client
console.log('[build] Building React client...');
execSync('npm run build', { cwd: clientDir, stdio: 'inherit' });

// 3. Copy dist → public/
console.log('[build] Copying to public/...');
if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(distDir, publicDir, { recursive: true });

console.log('[build] Done. Client ready at public/');
