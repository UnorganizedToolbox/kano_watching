const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/page.tsx', 'utf8');

// The dashboard has hardcoded "共通テストまで" and "138 日"
// We have `profile` loaded.
content = content.replace(
  /<span className="text-\[10px\] block text-white\/80 font-bold">共通テストまで<\/span>\s*<span className="text-3xl font-black font-title">138 日<\/span>/,
  `{profile?.target_date ? (
                <>
                  <span className="text-[10px] block text-white/80 font-bold">{profile.target_title || '目標日まで'}</span>
                  <span className="text-3xl font-black font-title">
                    {Math.max(0, Math.ceil((new Date(profile.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} 日
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] block text-white/80 font-bold">目標未設定</span>
                  <span className="text-xl font-bold mt-2 inline-block">-- 日</span>
                </>
              )}`
);

fs.writeFileSync('src/app/(app)/page.tsx', content);
