'use client'

import { useEffect } from 'react';
import { syncPinnedTheme } from '../../actions/theme';

const THEME_CLASS_PATTERN = /(theme-\w+|glass|brutalist|clay|lofi|aurora|cafe|matcha|default)/g;

export default function ThemeEnforcer({ pinnedTheme }: { pinnedTheme: string | null }) {
  useEffect(() => {
    if (!pinnedTheme) return;
    const current = document.body.className.match(/theme-\w+/)?.[0];
    if (current !== pinnedTheme) {
      document.body.className = document.body.className.replace(THEME_CLASS_PATTERN, '').trim() + ' ' + pinnedTheme;
      void syncPinnedTheme(pinnedTheme);
    }
  }, [pinnedTheme]);

  return null;
}
