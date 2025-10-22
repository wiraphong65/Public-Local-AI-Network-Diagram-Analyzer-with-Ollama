import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey;
      const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey;
      const altMatches = !!event.altKey === !!shortcut.altKey;
      const metaMatches = !!event.metaKey === !!shortcut.metaKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchingShortcut) {
      event.preventDefault();
      event.stopPropagation();
      matchingShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: shortcuts.map(s => ({
      ...s,
      displayKey: formatShortcutDisplay(s)
    }))
  };
};

const formatShortcutDisplay = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.metaKey) parts.push('Cmd');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
};

// Default network diagram shortcuts
export const createNetworkShortcuts = (
  undo: () => void,
  redo: () => void,
  canUndo: boolean,
  canRedo: boolean,
  onSave?: () => void,
  onCopy?: () => void,
  onPaste?: () => void,
  onSelectAll?: () => void,
  onDelete?: () => void
): KeyboardShortcut[] => [
  {
    key: 'z',
    ctrlKey: true,
    action: () => canUndo && undo(),
    description: 'Undo last action',
    category: 'Edit'
  },
  {
    key: 'y',
    ctrlKey: true,
    action: () => canRedo && redo(),
    description: 'Redo last action',
    category: 'Edit'
  },
  {
    key: 'z',
    ctrlKey: true,
    shiftKey: true,
    action: () => canRedo && redo(),
    description: 'Redo last action (alternative)',
    category: 'Edit'
  },
  ...(onSave ? [{
    key: 's',
    ctrlKey: true,
    action: onSave,
    description: 'Save project',
    category: 'File'
  }] : []),
  ...(onCopy ? [{
    key: 'c',
    ctrlKey: true,
    action: onCopy,
    description: 'Copy selected items',
    category: 'Edit'
  }] : []),
  ...(onPaste ? [{
    key: 'v',
    ctrlKey: true,
    action: onPaste,
    description: 'Paste items',
    category: 'Edit'
  }] : []),
  ...(onSelectAll ? [{
    key: 'a',
    ctrlKey: true,
    action: onSelectAll,
    description: 'Select all items',
    category: 'Select'
  }] : []),
  ...(onDelete ? [{
    key: 'Delete',
    action: onDelete,
    description: 'Delete selected items',
    category: 'Edit'
  }] : [])
];