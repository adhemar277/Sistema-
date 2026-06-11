const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

fs.readdirSync(pagesDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Add overflow wrapper to tables if missing
    // Many tables might already be in a div, but adding a specific overflow wrapper helps.
    // Check if it already has overflow-x-auto before the table
    
    // Quick regex replace: if we see <table but no overflow-x-auto near it
    // Actually simpler: just replace `<table` with `<div className="overflow-x-auto w-full"><table` 
    // and `</table>` with `</table></div>` ONLY if we haven't done it.
    
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
