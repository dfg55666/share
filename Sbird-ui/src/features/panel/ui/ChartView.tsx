import React from 'react';
import styles from './ChartView.module.scss';

export interface PlanetPosition {
  house: number;
  symbol: string;
  color?: 'red' | 'green' | 'blue' | 'default';
}

export interface ChartViewProps {
  planets?: PlanetPosition[];
}

const PLANET_COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  green: '#22c55e',
  blue: '#3b82f6',
  default: 'var(--sb-text-primary)',
};

const ChartView: React.FC<ChartViewProps> = () => {
  // Static North Indian Diamond Chart layout
  // Positions are hardcoded per design spec
  return (
    <div className={styles.container}>
      <svg
        viewBox="0 0 400 400"
        xmlns="http://www.w3.org/2000/svg"
        className={styles.svg}
        aria-label="North Indian Diamond Chart"
      >
        {/* White background */}
        <rect x="0" y="0" width="400" height="400" fill="white" />

        {/* ── Structural lines ─────────────────────────────────── */}

        {/* Outer rectangle */}
        <rect
          x="10"
          y="10"
          width="380"
          height="380"
          fill="none"
          stroke="#d4d4d8"
          strokeWidth="1.5"
        />

        {/* Diagonal lines forming diamond pattern */}
        <line x1="200" y1="10" x2="10" y2="200" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="200" y1="10" x2="390" y2="200" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="200" y1="390" x2="10" y2="200" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="200" y1="390" x2="390" y2="200" stroke="#d4d4d8" strokeWidth="1" />

        {/* Cross lines */}
        <line x1="200" y1="10" x2="200" y2="390" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="10" y1="200" x2="390" y2="200" stroke="#d4d4d8" strokeWidth="1" />

        {/* Inner diamond: corners to center */}
        <line x1="105" y1="105" x2="200" y2="200" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="295" y1="105" x2="200" y2="200" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="105" y1="295" x2="200" y2="200" stroke="#d4d4d8" strokeWidth="1" />
        <line x1="295" y1="295" x2="200" y2="200" stroke="#d4d4d8" strokeWidth="1" />

        {/* ── House Numbers ────────────────────────────────────── */}

        {/* House 10 — top-left corner triangle */}
        <text x="54" y="80" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">10</text>

        {/* House 11 — top-right triangle (upper right) */}
        <text x="346" y="80" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">11</text>

        {/* House 12 — top-center triangle */}
        <text x="200" y="56" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">12</text>

        {/* House 1 / Lagna — center diamond (top) */}
        <text x="200" y="186" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">1</text>

        {/* House 2 — right-upper */}
        <text x="346" y="148" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">2</text>

        {/* House 3 — right-lower */}
        <text x="346" y="260" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">3</text>

        {/* House 4 — bottom-right corner */}
        <text x="346" y="340" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">4</text>

        {/* House 5 — bottom-center triangle */}
        <text x="200" y="364" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">5</text>

        {/* House 6 — bottom-left corner */}
        <text x="54" y="340" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">6</text>

        {/* House 7 — left-lower */}
        <text x="54" y="260" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">7</text>

        {/* House 8 — left-upper */}
        <text x="54" y="148" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">8</text>

        {/* House 9 — center diamond (left) */}
        <text x="148" y="210" fontSize="13" fill="var(--sb-text-secondary)" textAnchor="middle" fontFamily="var(--sb-font-family)">9</text>

        {/* ── Planet Labels ────────────────────────────────────── */}

        {/* House 10 top-left: Ma (red) */}
        <text
          x="54"
          y="122"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.red}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Ma
        </text>

        {/* House 11 top-right: Su (green) */}
        <text
          x="346"
          y="110"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.green}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Su
        </text>

        {/* House 12 top-center: Asc (green) */}
        <text
          x="200"
          y="92"
          fontSize="15"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.green}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Asc
        </text>

        {/* House 2 right-upper: Me (blue) */}
        <text
          x="346"
          y="188"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.blue}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Me
        </text>

        {/* House 8 left-upper: Mo (default) */}
        <text
          x="54"
          y="188"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.default}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Mo
        </text>

        {/* House 9 center-left: Ju (green) */}
        <text
          x="148"
          y="230"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.green}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Ju
        </text>

        {/* House 6 bottom-left: Sa (red) */}
        <text
          x="54"
          y="305"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.red}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Sa
        </text>

        {/* House 3 right-lower: Ve (default) */}
        <text
          x="346"
          y="305"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.default}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Ve
        </text>

        {/* House 5 bottom-center: Ke (default) */}
        <text
          x="200"
          y="330"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.default}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Ke
        </text>

        {/* House 4 bottom-right: Ra (red) */}
        <text
          x="346"
          y="365"
          fontSize="14"
          fontWeight="700"
          fill={PLANET_COLOR_MAP.red}
          textAnchor="middle"
          fontFamily="var(--sb-font-family)"
        >
          Ra
        </text>
      </svg>
    </div>
  );
};

export default ChartView;
