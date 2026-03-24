const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /bg-slate-900/g, replacement: 'bg-inverted' },
  { regex: /text-slate-600/g, replacement: 'text-content-muted' },
  { regex: /hover:bg-slate-100/g, replacement: 'hover:bg-surface-hover' },
  { regex: /hover:bg-slate-800/g, replacement: 'hover:opacity-90' },
  { regex: /border-slate-200/g, replacement: 'border-subtle' },
];

function processDirectory(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      replacements.forEach(({ regex, replacement }) => {
        content = content.replace(regex, replacement);
      });
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  });
}

processDirectory(directoryPath);
