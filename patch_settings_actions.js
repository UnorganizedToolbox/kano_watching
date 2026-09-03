const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/actions.ts', 'utf8');

content = content.replace(
  /const name = formData\.get\('name'\) as string;/,
  `const name = formData.get('name') as string;\n  const targetTitle = formData.get('target_title') as string;\n  const targetDate = formData.get('target_date') as string;`
);

content = content.replace(
  /name: name || user\.email\?\.split\('@'\)\[0\]/,
  `name: name || user.email?.split('@')[0],\n      target_title: targetTitle || null,\n      target_date: targetDate || null`
);

fs.writeFileSync('src/app/(app)/settings/actions.ts', content);
