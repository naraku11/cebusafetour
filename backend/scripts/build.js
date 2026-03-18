/**
 * Build script — runs during Hostinger deployment
 * 1. Installs admin dependencies
 * 2. Builds React admin panel (Vite)
 * 3. Copies admin/dist → backend/public (served as static files by Express)
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const adminDir  = path.join(__dirname, '../../admin');
const distDir   = path.join(adminDir, 'dist');
const publicDir = path.join(__dirname, '../public');

// 1. Install admin deps
console.log('[build] Installing admin dependencies...');
execSync('npm install', { cwd: adminDir, stdio: 'inherit' });

// 2. Build admin
console.log('[build] Building admin panel...');
execSync('npm run build', { cwd: adminDir, stdio: 'inherit' });

// 3. Copy dist → backend/public
console.log('[build] Copying to backend/public...');
if (fs.existsSync(publicDir)) fs.rmSync(publicDir, { recursive: true, force: true });
fs.cpSync(distDir, publicDir, { recursive: true });

console.log('[build] Done. Admin panel ready at backend/public');
