const fs = require('fs');

let content = fs.readFileSync('src/app/(app)/timer/actions.ts', 'utf8');

const replacement = `  if (!user) throw new Error('ログインしていません');

  // April Fools Easter Egg
  const today = new Date();
  const isAprilFirst = today.getMonth() === 3 && today.getDate() === 1;
  const isAprilFoolTag = title.includes('#Aprilfool') || body.includes('#Aprilfool');

  let image_url = null;`;

content = content.replace(/  if \(\!user\) throw new Error\('ログインしていません'\);\n\n  let image_url = null;/, replacement);

const replacementInsert = `  // Easter Egg Intercept
  if (isAprilFirst && isAprilFoolTag) {
    const randomScore = Math.floor(Math.random() * 101);
    const { error } = await supabase.from('questions').insert({
      student_uuid: user.id,
      title,
      body,
      image_url,
      status: 'answered',
      answer_body: \`🎉 エイプリルフール特別判定！\nあなたの嘘の点数は... 【 \${randomScore}点 】 です！\`
    });

    if (error) {
      console.error('Failed to post april fool question', error);
      throw new Error('質問の送信に失敗しました');
    }

    revalidatePath('/timer');
    return;
  }

  const { error } = await supabase.from('questions').insert({`;

content = content.replace(/  const \{ error \} = await supabase\.from\('questions'\)\.insert\(\{/, replacementInsert);

fs.writeFileSync('src/app/(app)/timer/actions.ts', content);
