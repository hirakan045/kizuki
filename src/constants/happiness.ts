import type { HappinessLevel } from '../types';

/** 幸福度5段階の表示（glossary: 数値を表示しない。言葉と絵文字のみ） */
export const HAPPINESS_OPTIONS: {
  value: HappinessLevel;
  emoji: string;
  label: string;
}[] = [
  { value: 1, emoji: '😞', label: 'よくなかった' },
  { value: 2, emoji: '😕', label: 'あまりよくなかった' },
  { value: 3, emoji: '😐', label: 'ふつう' },
  { value: 4, emoji: '🙂', label: 'よかった' },
  { value: 5, emoji: '😊', label: 'とてもよかった' },
];

export const happinessEmoji = (value: number): string =>
  HAPPINESS_OPTIONS.find((o) => o.value === value)?.emoji ?? '';
