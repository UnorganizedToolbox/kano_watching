const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/game/GamePortalClient.tsx', 'utf8');

// Change Tabs
content = content.replace(
  /const TABS = \[\s*\{ id: 'daily', label: 'デイリー', icon: <CalendarDays className="w-4 h-4" \/> \},\s*\{ id: 'weekly', label: 'ウィークリー', icon: <Target className="w-4 h-4" \/> \},\s*\{ id: 'lifetime', label: '実績', icon: <Trophy className="w-4 h-4" \/> \},\s*\];/,
  `const TABS = [\n  { id: 'daily', label: 'デイリー', icon: <CalendarDays className="w-4 h-4" /> },\n  { id: 'weekly', label: 'ウィークリー', icon: <Target className="w-4 h-4" /> },\n];`
);

// We need to fix the type of activeTab if it has 'lifetime'. It's probably `useState('daily')`.
// Also fix the filter logic in the component.
// `achieve.category === (activeTab === 'lifetime' ? 'GENERAL' : activeTab.toUpperCase())`
content = content.replace(
  /achieve.category === \(activeTab === 'lifetime' \? 'GENERAL' : activeTab.toUpperCase\(\)\)/g,
  `achieve.category === activeTab.toUpperCase()`
);

fs.writeFileSync('src/app/(app)/game/GamePortalClient.tsx', content);
