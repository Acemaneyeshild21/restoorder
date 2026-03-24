const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /orange-500/g, replacement: 'primary' },
  { regex: /orange-600/g, replacement: 'primary-hover' },
  { regex: /orange-50/g, replacement: 'primary-50' },
  { regex: /orange-100/g, replacement: 'primary-100' },
  { regex: /bg-white/g, replacement: 'bg-surface' },
  { regex: /bg-gray-50/g, replacement: 'bg-background' },
  { regex: /bg-gray-100/g, replacement: 'bg-surface-hover' },
  { regex: /bg-gray-900/g, replacement: 'bg-inverted' },
  { regex: /text-gray-900/g, replacement: 'text-content' },
  { regex: /text-gray-800/g, replacement: 'text-content' },
  { regex: /text-gray-600/g, replacement: 'text-content-muted' },
  { regex: /text-gray-500/g, replacement: 'text-content-muted' },
  { regex: /border-gray-100/g, replacement: 'border-subtle' },
  { regex: /border-gray-200/g, replacement: 'border-subtle' },
  { regex: /border-gray-300/g, replacement: 'border-default' },
  { regex: /text-white/g, replacement: 'text-content-inverted' },
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
