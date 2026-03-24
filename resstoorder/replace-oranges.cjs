const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /text-orange-900/g, replacement: 'text-primary-hover' },
  { regex: /text-orange-200/g, replacement: 'text-primary-100' },
  { regex: /via-orange-200\/50/g, replacement: 'via-primary-100/50' },
  { regex: /border-orange-400\/30/g, replacement: 'border-primary/30' },
  { regex: /border-orange-200/g, replacement: 'border-primary-100' },
  { regex: /text-orange-700/g, replacement: 'text-primary-hover' },
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
