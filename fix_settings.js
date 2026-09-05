const fs = require('fs');
let content = fs.readFileSync('src/app/(app)/settings/SettingsClient.tsx', 'utf8');

// 1. Add linkGoogleAccount import
content = content.replace(
  "import { Cloud } from 'lucide-react';",
  "import { Cloud } from 'lucide-react';\nimport { linkGoogleAccount } from './actions';"
);
// Wait, I replaced the lucide-react import previously to include Cloud.
// Let's just put it under the createClient import.
content = content.replace(
  "import { createClient } from '@/utils/supabase/client';",
  "import { createClient } from '@/utils/supabase/client';\nimport { linkGoogleAccount } from './actions';"
);

// 2. Add 'sync' to Tab type
content = content.replace(
  "type Tab = 'general' | 'profile' | 'gamification' | 'theme' | 'billing' | 'ai';",
  "type Tab = 'general' | 'profile' | 'gamification' | 'theme' | 'billing' | 'ai' | 'sync';"
);

// 3. Add 'sync' to tabs array
const tabsArray = `  const tabs = [
    { id: 'general', label: '全般', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'profile', label: 'プロフィール', icon: <User className="w-4 h-4" /> },
    { id: 'gamification', label: 'ゲーミフィケーション', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'theme', label: 'テーマ', icon: <Palette className="w-4 h-4" /> },
    { id: 'sync', label: '同期', icon: <Cloud className="w-4 h-4" /> },
    { id: 'ai', label: 'AI設定', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'billing', label: '購入とサブスクリプション', icon: <CreditCard className="w-4 h-4" /> },
  ];`;
const oldTabsArrayRegex = /const tabs = \[\s*\{ id: 'general'.*?\s*\{ id: 'profile'.*?\s*\{ id: 'gamification'.*?\s*\{ id: 'theme'.*?\s*\{ id: 'ai'.*?\s*\{ id: 'billing'.*?\s*\];/s;
content = content.replace(oldTabsArrayRegex, tabsArray);

fs.writeFileSync('src/app/(app)/settings/SettingsClient.tsx', content);
