import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

/** Maps every PostScript family name (as used in tokens.fontFamilies) to its font resource. */
export const FONT_FAMILIES_TO_LOAD = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} as const;

/**
 * Returns true once every brand font is ready. Render nothing until this resolves —
 * see FontGate in src/navigation/App.tsx. (Inter only — Montserrat was removed in v2.)
 */
export function useAppFonts(): boolean {
  const [interLoaded, interError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });
  if (interError) console.error('[fonts] Inter load failed', interError);
  return interLoaded === true;
}