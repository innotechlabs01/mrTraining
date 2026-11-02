import React from 'react';
import { useWindowDimensions, StyleSheet } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { colors, layout, spacing, typography, fontFamilies } from '../../theme/tokens';

type Props = { html: string };

/**
 * Renders article/blog HTML with the app's dark-theme styling.
 * CKEditor (web) saves content as HTML — this component converts it to
 * native React Native Text/View nodes so athletes see styled content,
 * never raw tags.
 */
export function HtmlBody({ html }: Props) {
  const { width } = useWindowDimensions();

  const baseStyle = {
    color: colors.text,
    fontFamily: fontFamilies.body,
    fontSize: typography.body.fontSize,
    lineHeight: 24,
  };

  const tagsStyles: Record<string, object> = {
    body: { ...baseStyle },
    p: { ...baseStyle, marginBottom: spacing.md },
    h1: {
      fontFamily: fontFamilies.display,
      fontSize: typography.h1.fontSize,
      lineHeight: 38,
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.md,
      marginTop: spacing.lg,
    },
    h2: {
      fontFamily: fontFamilies.display,
      fontSize: typography.h2.fontSize,
      lineHeight: 32,
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.sm,
      marginTop: spacing.lg,
    },
    h3: {
      fontFamily: fontFamilies.display,
      fontSize: typography.h3.fontSize,
      lineHeight: 28,
      color: colors.text,
      fontWeight: '600',
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    strong: {
      fontFamily: fontFamilies.bodyBold,
      fontWeight: '700',
      color: colors.text,
    },
    em: { fontStyle: 'italic', color: colors.text },
    ul: { marginBottom: spacing.md, paddingLeft: spacing.lg },
    ol: { marginBottom: spacing.md, paddingLeft: spacing.lg },
    li: { ...baseStyle, marginBottom: spacing.xs },
    blockquote: {
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
      paddingLeft: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xs,
      marginTop: spacing.md,
      marginBottom: spacing.md,
      backgroundColor: `${colors.primary}0A`,
      fontStyle: 'italic',
      color: colors.textSecondary,
    },
    a: { color: colors.primary, textDecorationLine: 'underline' },
    img: {
      maxWidth: width - layout.pagePadding * 2,
      borderRadius: 12,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    code: {
      fontFamily: 'monospace',
      fontSize: typography.bodySmall.fontSize,
      color: colors.warning,
      backgroundColor: colors.surface,
      padding: spacing.xs,
      borderRadius: 4,
    },
    pre: {
      fontFamily: 'monospace',
      fontSize: typography.bodySmall.fontSize,
      color: colors.text,
      backgroundColor: colors.surface,
      padding: spacing.md,
      borderRadius: 8,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    hr: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      marginTop: spacing.md,
      marginBottom: spacing.md,
    },
    th: {
      fontFamily: fontFamilies.bodyBold,
      color: colors.primary,
      padding: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    td: { ...baseStyle, padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  };

  return (
    <RenderHTML
      source={{ html }}
      contentWidth={width - layout.pagePadding * 2}
      tagsStyles={tagsStyles as any}
      defaultTextProps={{ allowFontScaling: true }}
    />
  );
}
