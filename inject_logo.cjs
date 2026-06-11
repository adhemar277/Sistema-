const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');

const logoInjector = `printWindow.document.write('<div style="text-align: center; margin-bottom: 20px;">');
    const logoUrl = window.location.origin + '/logo.png';
    printWindow.document.write(\`<img src="\${logoUrl}" style="height: 80px; margin-bottom: 10px;" />\`);`;

fs.readdirSync(pagesDir).forEach(file => {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(pagesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('handleExportPDF')) {
      // Replace the start of the div
      if (content.includes('printWindow.document.write(\'<div style="text-align: center; margin-bottom: 20px;">\');') && !content.includes('/logo.png')) {
        content = content.replace(
          'printWindow.document.write(\'<div style="text-align: center; margin-bottom: 20px;">\');',
          logoInjector
        );
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Injected logo into ' + file);
      }
    }
  }
});
