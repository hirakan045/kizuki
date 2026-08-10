# 設計 — 履歴画面の折れ線グラフ（WBS 4.3.3）

## 変更するコンポーネント

| ファイル                       | 変更内容                                              |
| ------------------------------- | ------------------------------------------------------ |
| `src/components/TrendChart.tsx` | 新規。歩数・睡眠を重ねた折れ線グラフ（Props駆動）      |
| `app/(tabs)/history.tsx`        | `FlatList` の `ListHeaderComponent` に `TrendChart` を追加 |
| `package.json`                  | `react-native-svg` を追加                             |

## ライブラリ

`react-native-svg` を導入し、`Svg` / `Polyline` で自前描画する。
理由：表示するのは2系列の単純な折れ線のみで、チャートライブラリの機能（凡例・アニメーション・軸ラベルの自動生成等）は不要。依存を絞る。

⚠️ ネイティブモジュールのため、導入後は development build の再ビルドが必要（このセッションで実施）。

## データ構造

`TrendChart` はデータ取得を行わず、Props で受け取る（development-guidelines 4章の原則）。

```ts
type TrendPoint = { dateKey: string; steps: number | null; sleepMinutes: number | null };
type Props = { data: TrendPoint[] }; // 古い→新しい順
```

- `history.tsx` は既存の `rows`（新しい→古い順）を反転して渡す
- `steps` / `sleepMinutes` が `null` の日はその点を描かず、線を途切れさせる（欠損を0扱いしない。要件どおり）
- 各系列は自身の min/max で正規化してSVG座標に変換する（歩数と睡眠は単位が違うため、重ねて見せるには系列ごとの正規化が必要）

## 見た目

- 既存の `colors.steps` (`#1C1C1E`) / `colors.sleep` (`#6B7280`) をそのまま使う。新しい色は追加しない
- 軸ラベル・目盛りは表示しない（「絞る」原則。傾向を見るためのグラフであり、精密な読み取りは目的としない）
- 上部に小さな凡例（歩数／睡眠の色分けのみ、数値評価なし）
- 全日程がデータなしの場合はグラフ自体を表示しない（`DayListItem`の「―」表示と同じ思想）

## 影響範囲

- `docs/functional-design.md` 6章の `TrendChart` は既に記載済みのため変更不要
- `docs/architecture.md` に `react-native-svg` 採用の記録を1行追加する
