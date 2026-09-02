const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// Import ProceduralAvatar
content = content.replace(/import \{ Settings2/, "import ProceduralAvatar from '../components/ProceduralAvatar';\nimport { Settings2");

// Add state for avatar seeds
content = content.replace(/const \[hasApiKey, setHasApiKey\] = useState\(false\);/,
  `const [hasApiKey, setHasApiKey] = useState(false);\n  const [avatarSeed, setAvatarSeed] = useState('LearnFlowUser123');\n  const [savedAvatars, setSavedAvatars] = useState<string[]>(['LearnFlowUser123']);`);

// Replace the dicebear URLs with <ProceduralAvatar>
content = content.replace(/<img src="https:\/\/api\.dicebear\.com\/7\.x\/bottts\/svg\?seed=LearnFlow123" alt="Avatar" className="w-full h-full object-cover" \/>/,
  `<ProceduralAvatar seed={avatarSeed} />`);
  
content = content.replace(/<img src="https:\/\/api\.dicebear\.com\/7\.x\/bottts\/svg\?seed=LearnFlow123" alt="Saved 1" className="w-full h-full" \/>/,
  `{savedAvatars.map((seed, i) => (
                              <div key={i} onClick={() => setAvatarSeed(seed)} className="w-10 h-10 rounded-full border-2 border-brand-500 cursor-pointer overflow-hidden transition-transform hover:scale-110">
                                <ProceduralAvatar seed={seed} />
                              </div>
                            ))}
                            {Array.from({ length: 5 - savedAvatars.length }).map((_, i) => (
                              <div key={'empty-'+i} className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">
                                <i className="fa-solid fa-plus text-xs"></i>
                              </div>
                            ))}`);

// Clean up the hardcoded saved 1 and empty slots that I just replaced dynamically
content = content.replace(/<div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">\s*<i className="fa-solid fa-plus text-xs"><\/i>\s*<\/div>\s*<div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">\s*<i className="fa-solid fa-plus text-xs"><\/i>\s*<\/div>\s*<div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">\s*<i className="fa-solid fa-plus text-xs"><\/i>\s*<\/div>\s*<div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-300 cursor-not-allowed">\s*<i className="fa-solid fa-plus text-xs"><\/i>\s*<\/div>/, "");

// Add onClick to the reroll button
content = content.replace(/<button className="w-full py-2 bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900\/50 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2">/,
  `<button onClick={() => {
                              const newSeed = Math.random().toString(36).substring(7);
                              setAvatarSeed(newSeed);
                              if (savedAvatars.length < 5 && !savedAvatars.includes(newSeed)) {
                                setSavedAvatars([...savedAvatars, newSeed]);
                              } else if (!savedAvatars.includes(newSeed)) {
                                // If full, just replace the last one for the mockup
                                const newArr = [...savedAvatars];
                                newArr[4] = newSeed;
                                setSavedAvatars(newArr);
                              }
                            }} className="w-full py-2 bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-95">`);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
