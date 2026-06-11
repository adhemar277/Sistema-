const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

fs.readdirSync(pagesDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    let modified = false;
    
    if (content.includes('<table') && !content.includes('overflow-x-auto w-full')) {
        content = content.replace(/<table/g, '<div className="overflow-x-auto w-full"><table');
        content = content.replace(/<\/table>/g, '</table></div>');
        modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + file);
    }
  }
});
