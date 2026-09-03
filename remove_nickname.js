const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/page.tsx', 'utf8');

const regex = /\{\/\* Nickname sector \*\/\}.*?<\/div>\s*<\/div>/s;
content = content.replace(regex, '');

fs.writeFileSync('src/app/(app)/page.tsx', content);
