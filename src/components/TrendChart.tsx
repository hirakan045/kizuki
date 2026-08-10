import { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { colors } from '../constants/colors';

export type TrendPoint = {
  dateKey: string;
  steps: number | null;
  sleepMinutes: number | null;
};

type Props = {
  /** 古い→新しい順 */
  data: TrendPoint[];
};

const HEIGHT = 100;
const PADDING_Y = 8;

/**
 * 値の配列を SVG の y座標に変換する。
 * null は欠損として扱い、線をつなげない（連続する non-null だけを1本のPolylineにする）。
 * 系列ごとに min/max で正規化する（歩数と睡眠は単位が違うため、傾向として重ねるにはこれが必要）。
 */
const buildSegments = (
  values: (number | null)[],
  width: number,
): { x: number; y: number }[][] => {
  const present = values.filter((v): v is number => v !== null);
  if (present.length === 0 || width <= 0) return [];

  const min = Math.min(...present);
  const max = Math.max(...present);
  const range = max - min;

  const toY = (v: number): number => {
    if (range === 0) return HEIGHT / 2;
    return PADDING_Y + (1 - (v - min) / range) * (HEIGHT - PADDING_Y * 2);
  };

  const step = values.length > 1 ? width / (values.length - 1) : 0;

  const segments: { x: number; y: number }[][] = [];
  let current: { x: number; y: number }[] = [];

  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 1) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: i * step, y: toY(v) });
  });
  if (current.length > 1) segments.push(current);

  return segments;
};

const toPointsAttr = (points: { x: number; y: number }[]): string =>
  points.map((p) => `${p.x},${p.y}`).join(' ');

export function TrendChart({ data }: Props) {
  const [width, setWidth] = useState(0);

  const hasSteps = data.some((d) => d.steps !== null);
  const hasSleep = data.some((d) => d.sleepMinutes !== null);
  if (!hasSteps && !hasSleep) return null;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const stepsSegments = buildSegments(data.map((d) => d.steps), width);
  const sleepSegments = buildSegments(
    data.map((d) => d.sleepMinutes),
    width,
  );

  return (
    <View style={styles.container}>
      <View style={styles.legend}>
        {hasSteps && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.steps }]} />
            <Text style={styles.legendLabel}>歩数</Text>
          </View>
        )}
        {hasSleep && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.sleep }]} />
            <Text style={styles.legendLabel}>睡眠</Text>
          </View>
        )}
      </View>
      <View onLayout={onLayout} style={styles.svgWrapper}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {stepsSegments.map((segment, i) => (
              <Polyline
                key={`steps-${i}`}
                points={toPointsAttr(segment)}
                fill="none"
                stroke={colors.steps}
                strokeWidth={2}
              />
            ))}
            {sleepSegments.map((segment, i) => (
              <Polyline
                key={`sleep-${i}`}
                points={toPointsAttr(segment)}
                fill="none"
                stroke={colors.sleep}
                strokeWidth={2}
              />
            ))}
          </Svg>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  svgWrapper: {
    height: HEIGHT,
  },
});
