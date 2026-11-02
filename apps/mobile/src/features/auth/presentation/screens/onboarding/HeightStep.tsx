import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../../../../../shared/theme/tokens';
import { HEIGHT_CM_VALUES, HEIGHT_FT_VALUES, HEIGHT_RULER_ITEM_WIDTH } from './constants';
import { RulerPicker } from './RulerPicker';
import { texts } from '../../../../../shared/i18n/texts';

const t = texts.screens.heightStep;
import { stepStyles } from './styles';
import { clampHeight, formatHeightDisplay } from './utils';

type Props = {
  height: number;
  heightUnit: 'CM' | 'FT';
  onUnitChange: (unit: 'CM' | 'FT') => void;
  onHeightChange: (value: number) => void;
};

export function HeightStep({ height, heightUnit, onUnitChange, onHeightChange }: Props) {
  const heightDisplay = formatHeightDisplay(height, heightUnit);
  const stepDelta = heightUnit === 'CM' ? 1 : 0.1;

  return (
    <View style={stepStyles.choicesInner}>
      <View style={stepStyles.fitBodySubtitleBar}>
        <Text style={stepStyles.fitBodySubtitleText}>
          Indica tu altura para calcular tus métricas con precisión.
        </Text>
      </View>

      <View style={stepStyles.unitToggleContainer}>
        <Pressable
          onPress={() => onUnitChange('CM')}
          style={[stepStyles.unitToggleBtn, heightUnit === 'CM' && stepStyles.unitToggleBtnActive]}
        >
          <Text
            style={[stepStyles.unitToggleText, heightUnit === 'CM' && stepStyles.unitToggleTextActive]}
          >
            CM
          </Text>
        </Pressable>
        <View style={stepStyles.unitToggleDivider} />
        <Pressable
          onPress={() => onUnitChange('FT')}
          style={[stepStyles.unitToggleBtn, heightUnit === 'FT' && stepStyles.unitToggleBtnActive]}
        >
          <Text
            style={[stepStyles.unitToggleText, heightUnit === 'FT' && stepStyles.unitToggleTextActive]}
          >
            FT
          </Text>
        </Pressable>
      </View>

      <View style={stepStyles.weightDisplayRow}>
        <Pressable
          onPress={() => onHeightChange(clampHeight(height - stepDelta, heightUnit))}
          style={stepStyles.weightArrowBtn}
          hitSlop={12}
        >
          <Text style={stepStyles.weightArrowText}>−</Text>
        </Pressable>
        <View style={stepStyles.weightValueBox}>
          <Text style={stepStyles.weightNumber}>{heightDisplay.number}</Text>
          {heightDisplay.unitLabel ? (
            <Text style={stepStyles.weightUnitLabel}>{heightDisplay.unitLabel}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() => onHeightChange(clampHeight(height + stepDelta, heightUnit))}
          style={stepStyles.weightArrowBtn}
          hitSlop={12}
        >
          <Text style={stepStyles.weightArrowText}>+</Text>
        </Pressable>
      </View>

      {heightUnit === 'CM' ? (
        <RulerPicker
          values={HEIGHT_CM_VALUES}
          value={height}
          onChange={onHeightChange}
          itemWidth={HEIGHT_RULER_ITEM_WIDTH}
        />
      ) : (
        <RulerPicker
          values={HEIGHT_FT_VALUES}
          value={height}
          onChange={onHeightChange}
          itemWidth={HEIGHT_RULER_ITEM_WIDTH}
          formatLabel={(v) => v.toFixed(1)}
          isMajor={(v) => Number.isInteger(v) || Math.abs(v * 10) % 5 === 0}
          isSelected={(v, current) => Math.abs(v - current) < 0.05}
        />
      )}
      <Text style={stepStyles.rulerHint}>
        {heightUnit === 'CM'
          ? t.hintCm
          : t.hintFt}
      </Text>

      {/* Vertical ruler homage to Figma 4.4 — compact visual aid, not primary interaction */}
      <View style={styles.heightVerticalHint}>
        <View style={styles.heightVerticalBar}>
          <View style={styles.heightVerticalTicks}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.heightVerticalTick,
                  i % 3 === 0 ? styles.heightVerticalTickMajor : styles.heightVerticalTickMinor,
                ]}
              />
            ))}
          </View>
          <View style={styles.heightVerticalIndicatorLine} />
        </View>
        <View style={styles.heightVerticalArrowWrap}>
          <View style={styles.heightVerticalArrow} />
        </View>
        <Text style={styles.heightVerticalLabel}>
          {heightUnit === 'CM' ? `${height} cm` : `${height.toFixed(1)} ft`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Height vertical homage to Figma 4.4
  heightVerticalHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 10,
  },
  heightVerticalBar: {
    width: 48,
    height: 88,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heightVerticalTicks: {
    gap: 6,
    alignItems: 'center',
  },
  heightVerticalTick: { borderRadius: 1, backgroundColor: colors.border },
  heightVerticalTickMinor: { width: 12, height: 1.5, opacity: 0.6 },
  heightVerticalTickMajor: {
    width: 20,
    height: 1.5,
    backgroundColor: colors.textSecondary,
    opacity: 0.9,
  },
  heightVerticalIndicatorLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 2,
    marginTop: -1,
    backgroundColor: colors.primary,
    opacity: 0.9,
  },
  heightVerticalArrowWrap: { justifyContent: 'center' },
  heightVerticalArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.primary,
    borderLeftWidth: 0,
  },
  heightVerticalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },
});
