const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/components/Sidebar.tsx', 'utf8');

content = content.replace(
  /<button onClick=\{\(\) => alert\('不具合報告モーダルは未実装です'\)\} className="(.*?)">\s*<TriangleAlert className="(.*?)" \/>\s*<span>不具合を報告<\/span>\s*<\/button>/,
  `<a href="mailto:support@learnflow.example.com?subject=不具合報告&body=【発生した画面】%0D%0A【不具合の内容】%0D%0A" className="$1">\n          <TriangleAlert className="$2" />\n          <span>不具合を報告</span>\n        </a>`
);

fs.writeFileSync('src/app/(app)/components/Sidebar.tsx', content);
