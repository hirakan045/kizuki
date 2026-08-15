/** 3桁区切り + 「歩」（glossary 4章） */
export const formatSteps = (steps: number): string =>
  `${String(Math.round(steps)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}歩`;

/** 時間と分 例: 6h52m */
export const formatSleepDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m}m`;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** 例: 8月9日（土） */
export const formatDateWithWeekday = (date: Date): string =>
  `${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`;

/** 過去日の幸福度質問文（glossary 4章） 例: 8月9日はどんな一日でしたか */
export const formatDateQuestion = (date: Date): string =>
  `${date.getMonth() + 1}月${date.getDate()}日はどんな一日でしたか`;
