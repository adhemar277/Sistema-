const fs = require('fs');
const path = require('path');

function replaceInDir(dir, replacements) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath, replacements);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const [search, replace] of replacements) {
                if (content.includes(search)) {
                    content = content.split(search).join(replace);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated:', fullPath);
            }
        }
    }
}

const replacements = [
    ['#0047AB', '#3776BC'],
    ['bg-indigo-600', 'bg-[#3776BC]'],
    ['bg-indigo-700', 'bg-blue-800'], // Approximation
    ['text-indigo-600', 'text-[#3776BC]'],
    ['text-indigo-700', 'text-[#3776BC]'],
    ['text-indigo-900', 'text-slate-800'],
    ['border-indigo-500', 'border-[#3776BC]'],
    ['text-indigo-500', 'text-[#3776BC]']
];

replaceInDir(path.join(__dirname, 'src'), replacements);
