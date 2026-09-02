const fs = require('fs');

function addErrorThrow(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/const { error([^}]*) } = await supabase\.from\('pomodoro_logs'\)\.insert\(\{([\s\S]*?)\}\);/g, 
    "const { error$1 } = await supabase.from('pomodoro_logs').insert({$2});\n  if (error$1) throw new Error('pomodoro_logs insert error: ' + error$1.message);");
    
  content = content.replace(/await supabase\.from\('student_activity_logs'\)\.insert\(\{([\s\S]*?)\}\);/g, 
    "const { error: actErr } = await supabase.from('student_activity_logs').insert({$1});\n  if (actErr) throw new Error('activity logs insert error: ' + actErr.message);");

  content = content.replace(/await supabase\.from\('profiles'\)\.update\(\{([\s\S]*?)\}\)\.eq\('id', user.id\);/g, 
    "const { error: profErr } = await supabase.from('profiles').update({$1}).eq('id', user.id);\n  if (profErr) throw new Error('profile update error: ' + profErr.message);");

  fs.writeFileSync(filePath, content);
}

addErrorThrow('src/app/(app)/timer/actions.ts');
