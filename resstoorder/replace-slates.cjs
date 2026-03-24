const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /bg-slate-50/g, replacement: 'bg-surface' },
  { regex: /bg-slate-100/g, replacement: 'bg-surface-hover' },
  { regex: /bg-slate-200/g, replacement: 'bg-border-default' },
  { regex: /bg-slate-800/g, replacement: 'bg-inverted' },
  { regex: /border-slate-100/g, replacement: 'border-subtle' },
  { regex: /border-slate-700/g, replacement: 'border-default' },
  { regex: /text-slate-300/g, replacement: 'text-content-muted' },
  { regex: /text-slate-400/g, replacement: 'text-content-muted' },
  { regex: /text-slate-500/g, replacement: 'text-content-muted' },
  { regex: /text-slate-700/g, replacement: 'text-content' },
  { regex: /text-slate-900/g, replacement: 'text-content' },
  { regex: /hover:bg-slate-50/g, replacement: 'hover:bg-surface-hover' },
  { regex: /hover:bg-slate-200/g, replacement: 'hover:bg-border-default' },
  { regex: /hover:text-slate-700/g, replacement: 'hover:text-content' },
  { regex: /divide-slate-100/g, replacement: 'divide-subtle' },
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
