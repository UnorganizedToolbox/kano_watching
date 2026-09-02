const fs = require('fs');

function addErrorThrow(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/await supabase\.from\('student_achievements'\)\.insert\(\{([\s\S]*?)\}\);/g, 
    "const { error: achErr } = await supabase.from('student_achievements').insert({$1});\n    if (achErr) console.error('achieve insert err:', achErr);");

  content = content.replace(/await supabase\.from\('profiles'\)\.update\(\{([\s\S]*?)\}\)\.eq\('id', userId\);/g, 
    "const { error: profErr } = await supabase.from('profiles').update({$1}).eq('id', userId);\n  if (profErr) console.error('engine profile err:', profErr);");

  fs.writeFileSync(filePath, content);
}

addErrorThrow('src/lib/gamification/engine.ts');
