import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { DiscoveryKind } from '../src/types';

type ReportRequestBody = {
  steps: number | null;
  sleepMinutes: number | null;
  happiness: number | null;
  averageSleepMinutes: number | null;
  discovery: { kind: DiscoveryKind; fact: string } | null;
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
- 構成は次の順で書く：
  1. 昨夜の睡眠（本人の平均との比較で）
  2. 昨日の歩数と、睡眠・幸福度との関係
  3. 「今日の発見」として渡された事実を1文で触れる（渡された事実の言い換え。新しい主張を作らない）`;

const buildUserPrompt = (body: ReportRequestBody): string => {
  const lines: string[] = [];
  lines.push(`昨日の歩数: ${body.steps !== null ? `${body.steps}歩` : 'データなし'}`);
  lines.push(
    `昨夜の睡眠: ${body.sleepMinutes !== null ? `${body.sleepMinutes}分` : 'データなし'}`,
  );
  lines.push(
    `本人の平均睡眠: ${
      body.averageSleepMinutes !== null ? `${body.averageSleepMinutes}分` : '算出不可（データ不足）'
    }`,
  );
  lines.push(`昨日の幸福度（1〜5）: ${body.happiness !== null ? body.happiness : '未入力'}`);
  lines.push(`今日の発見として渡す事実: ${body.discovery ? body.discovery.fact : 'なし'}`);
  return lines.join('\n');
};

const isValidBody = (value: unknown): value is ReportRequestBody => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const isNumOrNull = (x: unknown) => x === null || typeof x === 'number';
  return (
    isNumOrNull(v.steps) &&
    isNumOrNull(v.sleepMinutes) &&
    isNumOrNull(v.happiness) &&
    isNumOrNull(v.averageSleepMinutes) &&
    (v.discovery === null || typeof v.discovery === 'object')
  );
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
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(req.body) }],
    });

    if (response.stop_reason === 'refusal') {
      res.status(502).json({ error: 'Generation refused' });
      return;
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      res.status(502).json({ error: 'No text in response' });
      return;
    }

    res.status(200).json({ report: textBlock.text });
  } catch (e) {
    console.error('report generation failed', e);
    res.status(502).json({ error: 'Generation failed' });
  }
}
