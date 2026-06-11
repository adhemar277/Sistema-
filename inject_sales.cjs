const fs = require('fs');
const path = require('path');

const salesFile = path.join(__dirname, 'src', 'pages', 'Sales.tsx');
let content = fs.readFileSync(salesFile, 'utf8');

const logoInjector = `w.document.write('<div style="text-align:center;margin-bottom:30px">');
    const logoUrl = window.location.origin + '/logo.png';
    w.document.write(\`<img src="\${logoUrl}" style="height: 80px; margin-bottom: 10px;" />\`);`;

if (content.includes('w.document.write(\'<div style="text-align:center;margin-bottom:30px">\');')) {
    content = content.replace(
        'w.document.write(\'<div style="text-align:center;margin-bottom:30px">\');',
        logoInjector
    );
    fs.writeFileSync(salesFile, content, 'utf8');
    console.log('Injected logo into Sales.tsx');
}
