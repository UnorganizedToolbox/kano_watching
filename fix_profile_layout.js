const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

let target = `<div className="w-10 h-10 rounded-full border-2 border-brand-500 cursor-pointer overflow-hidden">\n                              {savedAvatars`;
content = content.replace(target, `{savedAvatars`);

let target2 = `                            ))}\n                            </div>\n                            \n                          </div>`;
let replacement2 = `                            ))}\n                          </div>`;
content = content.replace(target2, replacement2);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
