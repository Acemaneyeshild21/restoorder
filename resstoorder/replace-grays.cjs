const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /text-gray-700/g, replacement: 'text-content' },
  { regex: /text-gray-400/g, replacement: 'text-content-muted' },
  { regex: /text-gray-300/g, replacement: 'text-content-muted' },
  { regex: /bg-gray-200/g, replacement: 'bg-surface-hover' },
  { regex: /bg-gray-300/g, replacement: 'bg-border-default' },
  { regex: /border-gray-50/g, replacement: 'border-subtle' },
  { regex: /placeholder-gray-500/g, replacement: 'placeholder-content-muted' },
  { regex: /placeholder-gray-400/g, replacement: 'placeholder-content-muted' },
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
