import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { DiscoveryKind } from '../src/types';

const DISCOVERY_KINDS: DiscoveryKind[] = [
  'personalBest',
  'deviationFromAverage',
  'correlation',
  'weekdayPattern',
  'weeklyChange',
  'dataAccumulation',
];

type HistoryDay = {
  dateKey: string;
  steps: number | null;
  sleepMinutes: number | null;
};

type ReportRequestBody = {
  /** 直近30日分、古い→新しい順。最後の要素が対象日（昨日） */
  history: HistoryDay[];
  /** 対象日の幸福度 */
  happiness: number | null;
  /** 直近2日分に使われた発見の種類（新しい順、0〜2件） */
  recentDiscoveryKinds: DiscoveryKind[];
};

const SUBMIT_REPORT_TOOL: Anthropic.Tool = {
  name: 'submit_report',
  description: 'レポート本文と、今回使用した発見の種類を提出する',
  input_schema: {
    type: 'object',
    properties: {
      report: { type: 'string' },
      discoveryKind: { type: 'string', enum: DISCOVERY_KINDS },
    },
    required: ['report', 'discoveryKind'],
  },
};

const SYSTEM_PROMPT = `あなたは健康記録アプリ「きづき」のレポートを書くアシスタントです。

# 制約
- 専門用語を使わない（睡眠効率・HRV・REM等の語は使わない）
- 促す表現を使わない。次のような語尾・構文を禁止する：
  - 勧誘（〜しましょう / 〜してみませんか / 〜するといいですよ）
  - 義務・必要（〜が必要です / 〜すべきです / 〜したほうがいいです）
  - 目標提示（あと◯歩 / 目標まで / 〜を目指しましょう）
  - 評価・採点（よくできました / 頑張りましょう / 惜しかったですね）
  - 未達の指摘（足りていません / 不足しています / 達成できませんでした）
- 主語が「これからどうすべきか」になる文を書かない。主語は常に「過去にどうだったか」にする
- 良くなっている点から書き始める（悪い点を省略せず、記述の順序だけ変える）
- 二人称で書く。温度は持つが人格は装わない（「心配しています」「応援しています」等の感情表明はしない）
- 各段落2〜3文、全体で10文程度
- **記録が無いことを理由にして何かができない・わからないと説明する文を書かない。** 「〜できなかった」「判断できない」「比較できない」だけでなく、「〜のため、見えていない」「〜が残っていないため」「〜が分からなかった」のように、婉曲な言い回しで同じ趣旨（欠如の説明）を書くことも禁止する。判定基準は語尾ではなく**内容**：「なぜそれが言えないか」を説明する文は、言い回しを問わずすべて禁止。データが無い話題にはそもそも触れず、一言も言及せず省略する。実際に分かっていることだけを書く
- 単なる数値の記述にとどめず、その数値が持つ意味について一歩踏み込んだ解釈を加える（例: 歩数と睡眠・気分の関連について一般的に知られている傾向を踏まえる）。ただし専門用語は使わず平易な言葉で説明し、historyに無い事実を作らない
  - **この解釈は、対象日に実際にあるデータの範囲でのみ行う。** 対象日の睡眠データが無いのに、睡眠に関する一般知識（活動量と寝つきの関係など）を持ち出さない。一般知識を使って良いのは、それを裏付ける対象日のデータが両方（例: 歩数と睡眠の両方）揃っている場合だけ
  - 禁止する書き方の例：「日中の活動が夜の寝つきに関わるとされるが、今回はその裏付けとなる睡眠の記録が残っていなかった」→ 一般知識を持ち出した直後にデータの欠如を付け加える構文は、上のルールと合わせて二重に禁止
- 構成は次の順で書く：
  1. 昨夜の睡眠（対象日にデータがある場合のみ。本人の平均との比較で。対象日の睡眠データが無ければこの段落は書かず、歩数・幸福度を中心に書く）
  2. 昨日の歩数と、幸福度との関係（対象日に睡眠データもあれば、睡眠との関係にも触れてよい。対象日の睡眠データが無ければ、この段落でも睡眠には一切触れず、歩数と幸福度だけの関係を書く）
  3. 「今日の発見」（1文で触れる）

# 「今日の発見」の判断（あなたが行う）
渡された直近30日分のデータ（history、古い→新しい順、最後が対象日）から、以下の種類のうち**その日に成立するものを1つ選ぶ**。

| 種類 | kind値 | 成立条件 |
| --- | --- | --- |
| 過去最高 | personalBest | 直近30日で歩数・睡眠のいずれかが対象日に最大 |
| 平均との差 | deviationFromAverage | 平均から標準偏差1つ分以上離れている |
| 連動 | correlation | 直近7日で歩数と睡眠/幸福度に同方向の変化がある |
| 曜日の傾向 | weekdayPattern | 同一曜日のデータが3件以上ある |
| 週次の変化 | weeklyChange | 前週・今週それぞれ7日中5日以上データがあれば、両週の平均を比較する |
| データ蓄積の予告 | dataAccumulation | 上記いずれも成立しない場合のフォールバック |

判断のルール：
- **historyに含まれる実際の数値のみを根拠にする。存在しない数値や誇張した表現を作らない**
- 複数の種類が同時に成立する場合は、渡された recentDiscoveryKinds に含まれない種類を優先する
- 全ての候補が recentDiscoveryKinds と重複する、またはどれも成立しない場合は dataAccumulation を選ぶ
- dataAccumulation を選んだ場合、文言は「あと◯日分たまると〜が見えてきます」のようにデータが蓄積されつつある事実の記述にとどめる。「あと◯歩」のような個人の行動目標の提示（禁止表現）にしない
- 選んだ種類は submit_report ツールの discoveryKind に、レポート本文は report に入れて提出する（プレーンテキストでの回答はしない）
- **report フィールドには本文の文章のみを入れる。discoveryKind の値や、\`</report>\`・\`<parameter>\`のようなタグ文字列を report の中に書かない。** discoveryKind は必ず submit_report ツールの独立した discoveryKind フィールドに、report とは別の値として渡す

# 専門的な観点の活用
運動と睡眠の関係を説明する際は、以下のような生理学的な観点を踏まえてよい。
ただし平易な言葉に言い換え、断定は避け「〜と関連している可能性があります」と書く。

- 日中の活動は、体の内側の温度（深部体温）を一時的に上げ、その後の低下が
  寝つきやすさに関わるとされる
- 日中の活動量は、夜の眠気の強さ（睡眠圧）に関わるとされる
- 深い眠りやレム睡眠の割合は、体の回復や心の整理に関わるとされる

歩数や睡眠時間の数値をただ読み上げるのではなく、これらの観点を使って
「なぜそう考えられるか」まで一言添える。sleepBreakdown が渡されている場合は、
深い眠りやレム睡眠の割合にも触れてよい。`;

const buildUserPrompt = (body: ReportRequestBody): string => {
  const targetDay = body.history[body.history.length - 1];
  const lines: string[] = [];
  lines.push('直近30日分の記録（古い→新しい順、最後が対象日）:');
  for (const day of body.history) {
    const steps = day.steps !== null ? `${day.steps}歩` : 'データなし';
    const sleep = day.sleepMinutes !== null ? `${day.sleepMinutes}分` : 'データなし';
    lines.push(`${day.dateKey}: 歩数=${steps}, 睡眠=${sleep}`);
  }
  lines.push('');
  lines.push(
    `対象日（${targetDay?.dateKey ?? '不明'}）の幸福度（1〜5）: ${body.happiness !== null ? body.happiness : '未入力'}`,
  );
  lines.push(
    `直近2日で使われた発見の種類: ${
      body.recentDiscoveryKinds.length > 0 ? body.recentDiscoveryKinds.join(', ') : 'なし'
    }`,
  );
  return lines.join('\n');
};

const isValidHistoryDay = (value: unknown): value is HistoryDay => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isNumOrNull = (x: unknown) => x === null || typeof x === 'number';
  return typeof v.dateKey === 'string' && isNumOrNull(v.steps) && isNumOrNull(v.sleepMinutes);
};

const isValidBody = (value: unknown): value is ReportRequestBody => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isNumOrNull = (x: unknown) => x === null || typeof x === 'number';
  return (
    Array.isArray(v.history) &&
    v.history.length > 0 &&
    v.history.every(isValidHistoryDay) &&
    isNumOrNull(v.happiness) &&
    Array.isArray(v.recentDiscoveryKinds) &&
    v.recentDiscoveryKinds.every((k) => DISCOVERY_KINDS.includes(k as DiscoveryKind))
  );
};

/**
 * まれにClaudeが discoveryKind を report 本文の末尾に
 * `</report>\n<parameter name="discoveryKind">xxx</parameter>\n</invoke>` や
 * `...</parameter>\n<parameter name="discoveryKind">xxx` のような、
 * 壊れた形で埋め込むことがある（tool_use の構造化出力から外れて、
 * 古い形式のタグ風テキストが紛れ込む）。どのタグが最初に現れるか・
 * 閉じタグの有無は毎回一定ではないため、`</report>`の有無には依存せず、
 * ①discoveryKindの値をタグから抽出し、②最初に現れる壊れたタグの位置で
 * report本文を切り詰める、という2段構えで復元する。
 * 値が見つからない場合は復元不可としてnullを返す。
 */
const DISCOVERY_KIND_TAG_PATTERN = /<parameter\s+name="discoveryKind">\s*([a-zA-Z]+)/;
const STRAY_TAG_PATTERN = /<\/?(?:report|parameter|invoke)[^>]*>/;

const repairMalformedReport = (
  report: string,
): { report: string; discoveryKind: DiscoveryKind } | null => {
  const kindMatch = report.match(DISCOVERY_KIND_TAG_PATTERN);
  if (!kindMatch) return null;
  const kind = kindMatch[1];
  if (!DISCOVERY_KINDS.includes(kind as DiscoveryKind)) return null;

  const tagMatch = report.match(STRAY_TAG_PATTERN);
  const cutIndex = tagMatch?.index ?? kindMatch.index ?? 0;
  return { report: report.slice(0, cutIndex).trimEnd(), discoveryKind: kind as DiscoveryKind };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const appSecret = req.headers['x-app-secret'];
  if (!process.env.APP_SHARED_SECRET || appSecret !== process.env.APP_SHARED_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!isValidBody(req.body)) {
    console.error('report generation: invalid request body');
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [SUBMIT_REPORT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_report' },
      messages: [{ role: 'user', content: buildUserPrompt(req.body) }],
    });

    if (response.stop_reason === 'refusal') {
      console.error('report generation refused');
      res.status(502).json({ error: 'Generation refused' });
      return;
    }

    const toolUseBlock = response.content.find((b) => b.type === 'tool_use');
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      console.error('report generation: no tool_use', response.stop_reason);
      res.status(502).json({ error: 'No tool_use in response' });
      return;
    }

    const input = toolUseBlock.input as { report?: unknown; discoveryKind?: unknown };

    if (
      typeof input.report === 'string' &&
      typeof input.discoveryKind === 'string' &&
      DISCOVERY_KINDS.includes(input.discoveryKind as DiscoveryKind)
    ) {
      res.status(200).json({ report: input.report, discoveryKind: input.discoveryKind });
      return;
    }

    if (typeof input.report === 'string') {
      const repaired = repairMalformedReport(input.report);
      if (repaired) {
        console.warn('report generation: repaired malformed tool_use input');
        res.status(200).json(repaired);
        return;
      }
    }

    console.error('report generation: invalid tool_use input');
    res.status(502).json({ error: 'Invalid tool_use input' });
  } catch (e) {
    console.error('report generation failed', e);
    res.status(502).json({ error: 'Generation failed' });
  }
}
