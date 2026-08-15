import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { HappinessLevel } from '../types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * 幸福度5段階の表示（glossary: 数値を表示しない。アイコンと言葉のみ）。
 * 段階が上がるほどグレー系から緑系に色が明るくなるグラデーション。
 */
export const HAPPINESS_OPTIONS: {
  value: HappinessLevel;
  icon: IconName;
  color: string;
  label: string;
}[] = [
  { value: 1, icon: 'emoticon-cry-outline', color: '#616161', label: 'よくなかった' },
  { value: 2, icon: 'emoticon-sad-outline', color: '#9E9E9E', label: 'あまりよくなかった' },
  { value: 3, icon: 'emoticon-neutral-outline', color: '#AED581', label: 'ふつう' },
  { value: 4, icon: 'emoticon-happy-outline', color: '#7CB342', label: 'よかった' },
  { value: 5, icon: 'emoticon-excited-outline', color: '#2E7D32', label: 'とてもよかった' },
];

export const happinessOption = (value: number) =>
  HAPPINESS_OPTIONS.find((o) => o.value === value);
