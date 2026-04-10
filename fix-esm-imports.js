import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Run this file locally using: node fix-esm-imports.js
// It will automatically fix all missing .js extensions causing the Vercel crashes.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folders to scan
const directoriesToScan = ['server', 'api'];

function fixImports(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            fixImports(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Regex 1: Matches standard imports/exports (import { x } from "./y")
            const importRegex = /(import|export)\s+(.*?)\s+from\s+['"](\.[^'"]+)['"]/g;
            content = content.replace(importRegex, (match, p1, p2, p3) => {
                if (p3.endsWith('.js') || p3.endsWith('.json') || p3.endsWith('.ts')) return match;
                modified = true;
                return `${p1} ${p2} from "${p3}.js"`;
            });

            // Regex 2: Matches side-effect imports (import "./y")
            const sideEffectRegex = /import\s+['"](\.[^'"]+)['"]/g;
            content = content.replace(sideEffectRegex, (match, p1) => {
                 if (p1.endsWith('.js') || p1.endsWith('.json') || p1.endsWith('.ts')) return match;
                modified = true;
                return `import "${p1}.js"`;
            });

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`✅ Fixed imports in: ${fullPath}`);
            }
        }
    }
}

directoriesToScan.forEach(dir => {
    const fullDir = path.join(__dirname, dir);
    if (fs.existsSync(fullDir)) fixImports(fullDir);
});

console.log("🎉 All missing ESM imports have been patched!");