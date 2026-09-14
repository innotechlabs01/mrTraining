import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme/tokens';

export type IconProps = { size?: number; color?: string };

/** v2 icon-color policy (§2.1): every stroke icon rests at textSecondary. Callers override explicitly. */
export const DefaultColor = colors.textSecondary;
export const S = 24;

/* ------------------------------------------------------------------ *
 * Tab / core glyphs
 * ------------------------------------------------------------------ */

export function HomeIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 11 12 3l9 8" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M5 10v10h14V10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 20v-6h6v6" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function BarbellIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="1" y="9" width="22" height="6" rx="2" stroke={color} strokeWidth={2} />
      <Rect x="5" y="6" width="2.5" height="12" rx="1" fill={color} />
      <Rect x="16.5" y="6" width="2.5" height="12" rx="1" fill={color} />
      <Rect x="9.5" y="16.5" width="5" height="3" rx="1" fill={color} />
    </Svg>
  );
}

export function HeartPulseIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.4 4.6a5.5 5.5 0 0 0-7.8 0L12 5.2l-.6-.6a5.5 5.5 0 1 0-7.8 7.8l.6.6L12 20.8l7.8-7.8.6-.6a5.5 5.5 0 0 0 0-7.8Z"
        stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      />
      <Path d="M3.5 12h4l2-3.5 3 6 2-2.5h5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CalendarIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="16" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 9h18" stroke={color} strokeWidth={2} />
      <Circle cx="8" cy="14" r="1.2" fill={color} />
      <Circle cx="12" cy="14" r="1.2" fill={color} />
      <Circle cx="16" cy="14" r="1.2" fill={color} />
      <Path d="M8 3v4M16 3v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function UserIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth={2} />
      <Path d="M4 20c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function StoreIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h16l-1.5 13h-13L4 7z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 7a4 4 0 0 1 8 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MembershipIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="6" width="20" height="13" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M2 10h20" stroke={color} strokeWidth={2} />
      <Path d="M6 15h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function PlusIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function PlayIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 3l14 9-14 9V3z" fill={color} />
    </Svg>
  );
}

export function SearchIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
      <Path d="M16.5 16.5 21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 20a2 2 0 0 0 4 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * Navigation / back / chevrons
 * ------------------------------------------------------------------ */

export function ArrowLeftIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M11 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * Status glyphs (semantic color overrides at call sites)
 * ------------------------------------------------------------------ */

export function CloseIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function CheckIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 12.5l5 5L20 6.5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function AlertIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4 2.5 20h19L12 4z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 10v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="17" r="1" fill={color} />
    </Svg>
  );
}

export function InfoIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 11v5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="8" r="1" fill={color} />
    </Svg>
  );
}

export function WarningIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 8v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="16" r="1" fill={color} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * Settings / utility
 * ------------------------------------------------------------------ */

export function GearIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
      <Path
        d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.2 5.8 16.5 7.5M7.5 16.5 5.8 18.2M18.2 18.2 16.5 16.5M7.5 7.5 5.8 5.8"
        stroke={color} strokeWidth={2} strokeLinecap="round"
      />
    </Svg>
  );
}

export function StarIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5 14.6 9l6 .9-4.3 4.2 1 6L12 17.3 6.7 20.1l1-6L3.4 9.9l6-.9L12 3.5z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChartBarIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 20h16" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Rect x="6" y="11" width="3" height="6" rx="0.5" stroke={color} strokeWidth={2} />
      <Rect x="11" y="7" width="3" height="10" rx="0.5" stroke={color} strokeWidth={2} />
      <Rect x="16" y="4" width="3" height="13" rx="0.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function TrendUpIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 16l6-6 4 4 6-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 7h4v4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrendDownIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8l6 6 4-4 6 7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M16 17h4v-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChatIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16v11H9l-5 4V5z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M8 10h8M8 13h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function FilterIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 6h16M7 12h10M10 18h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ShareIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="6" r="2.5" stroke={color} strokeWidth={2} />
      <Circle cx="18" cy="18" r="2.5" stroke={color} strokeWidth={2} />
      <Path d="M8.5 10.5l7-3M8.5 13.5l7 3" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function EyeIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function MailIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="5" width="18" height="14" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 7l9 6 9-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TagIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx="7.5" cy="7.5" r="1.5" fill={color} />
    </Svg>
  );
}

export function LockIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="10" width="14" height="11" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="15" r="1.4" fill={color} />
    </Svg>
  );
}

export function LogoutIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M15 8l4 4-4 4M9 12h10" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function FireIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3c1 3 4 4.5 4 8a4 4 0 1 1-8 0c0-1.5.5-2.5 1-3.5C9.5 8.5 10 9 10 9c0-2 1-4 2-6z"
        stroke={color} strokeWidth={2} strokeLinejoin="round"
      />
      <Path d="M8.5 15.5a3.5 3.5 0 0 0 7 0c0-1.5-1-2.5-2-3.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MapPinIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx="12" cy="10" r="2.5" stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function HelpIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M9.5 9.3a2.6 2.6 0 0 1 5 .8c0 1.5-2.5 1.9-2.5 3.4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="12" cy="16.8" r="1" fill={color} />
    </Svg>
  );
}

export function CardIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="5" width="20" height="14" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M2 10h20" stroke={color} strokeWidth={2} />
      <Path d="M6 15h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ClockIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7v5l3 2" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TargetIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="12" r="1.5" fill={color} />
    </Svg>
  );
}

/* ------------------------------------------------------------------ *
 * Sport / effort glyphs (Onboarding + workout flows)
 * ------------------------------------------------------------------ */

export function DumbbellIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 8v8M17 8v8M4 10v4M20 10v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M7 12h10" stroke={color} strokeWidth={3.2} strokeLinecap="round" />
    </Svg>
  );
}

export function RunningIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="14.5" cy="4.5" r="1.8" stroke={color} strokeWidth={2} />
      <Path d="M11 9l2.5-2 3 1.5-2 2.5 1.5 3.5 2.5 1" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M4 10l4.5 1L11 15l-1.5 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SwimmingIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 20c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M5 7l2 4 3-2 2 3 4-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CyclingIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="5.5" cy="17" r="3" stroke={color} strokeWidth={2} />
      <Circle cx="18.5" cy="17" r="3" stroke={color} strokeWidth={2} />
      <Path d="M8 17h4l3.5-6h2.5M12 17l-2-6H6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TennisIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="16" cy="8" r="5" stroke={color} strokeWidth={2} />
      <Path d="M7 17c2 1 4 1 5 0M12 12c3-3 2-6 0-7M13 9c2 0 2-2 1-3" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M3 20l4-5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function YogaIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="4.5" r="1.8" stroke={color} strokeWidth={2} />
      <Path d="M9 9l3-1 3 1-1.5 5-3 1.5-1.5-3M12 8l1 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 20c2-2 5-2 5 0 0-2 3-2 5 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function SoccerIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} />
      <Path d="M12 7l4 3-1.5 5h-5L8 10l4-3z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M12 7V3M8 10l-4-2M11.5 15 10 19M13 6l3-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function TrophyIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4h10v6a5 5 0 0 1-10 0V4z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 15v3M9 20h6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function BuildingIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="3" width="14" height="18" rx="1.5" stroke={color} strokeWidth={2} />
      <Path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2M10 21v-2M14 21v-2" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function RefreshIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 12a8 8 0 1 1-2.34-5.66" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20 4v4h-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DeviceIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="8" width="18" height="12" rx="2" stroke={color} strokeWidth={2} />
      <Path d="M3 12h18" stroke={color} strokeWidth={2} />
      <Circle cx="7" cy="16" r="1" fill={color} />
    </Svg>
  );
}

export function PencilIcon({ size = S, color = DefaultColor }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
