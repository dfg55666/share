import React, { useState } from 'react';
import { Download } from 'lucide-react';
import styles from './RightPanel.module.scss';
import ChartView from './ChartView';
import SummaryCard from './SummaryCard';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PlanetData {
  abbr: string;
  name: string;
  sign: string;
  degree: string;
}

export interface NakshatraData {
  label: string;
  value: string;
}

export interface DashaItem {
  name: string;
  startDate: string;
  endDate: string;
  active?: boolean;
}

export interface RightPanelProps {
  activeTab?: 'chart' | 'report';
  onTabChange?: (tab: 'chart' | 'report') => void;
  onExport?: () => void;
  // Vedic header
  chartTitle?: string;
  birthTime?: string;
  birthPlace?: string;
  system?: string;
  // Planet data
  planets?: PlanetData[];
  nakshatras?: PlanetData[];
  nakshatraExtra?: NakshatraData[];
  // Dasha
  dashaTitle?: string;
  dashaSubtitle?: string;
  dashaItems?: DashaItem[];
  // Summary
  summaryTitle?: string;
  summaryLines?: string[];
  onGenerateReport?: () => void;
}

// ── Default mock data ──────────────────────────────────────────────────────

const DEFAULT_PLANETS_LEFT: PlanetData[] = [
  { abbr: 'Asc', name: '上升', sign: '白羊座', degree: "16°47'" },
  { abbr: 'Su', name: '太阳', sign: '金牛座', degree: "09°15'" },
  { abbr: 'Mo', name: '月亮', sign: '巨蟹座', degree: "27°56'" },
  { abbr: 'Me', name: '水星', sign: '狮子座', degree: "10°02'" },
  { abbr: 'Ve', name: '金星', sign: '财帛宫', degree: "23°17'" },
];

const DEFAULT_PLANETS_RIGHT: PlanetData[] = [
  { abbr: 'Ma', name: '火星', sign: '双子座', degree: "12°47'" },
  { abbr: 'Ju', name: '木星', sign: '射手座', degree: "15°03'" },
  { abbr: 'Sa', name: '土星', sign: '摩羯座', degree: "07°26'" },
  { abbr: 'Ra', name: '罗睺', sign: '双子座', degree: "02°19'" },
  { abbr: 'Ke', name: '计都', sign: '射手座', degree: "02°19'" },
];

const DEFAULT_NAKSHATRA_EXTRA: NakshatraData[] = [
  { label: '月亮所前', value: 'Pushya' },
  { label: '黄道区', value: 'Rohini' },
  { label: '四柱', value: "2'" },
  { label: '计算师', value: 'Rahasgari' },
  { label: '经建', value: '紫淳, 泛淳' },
];

const DEFAULT_DASHA_ITEMS: DashaItem[] = [
  { name: '火星大运', startDate: '2025', endDate: '2032', active: true },
  { name: '罗睺大运', startDate: '2032', endDate: '2050' },
  { name: '木星大运', startDate: '2050', endDate: '2066' },
  { name: '土星大运', startDate: '2066', endDate: '2085' },
  { name: '水星大运', startDate: '2085', endDate: '2102' },
];

const DEFAULT_SUMMARY_LINES = [
  '第1宫（上升宫）：白羊座上升，命主性格积极主动，充满活力与创造力。',
  '第4宫：巨蟹座，家庭根基稳固，情感深厚，注重安全感与归属。',
  '第7宫：天秤座，伴侣关系和谐，追求平衡与美感的合作模式。',
  '第10宫：摩羯座，事业心强，稳步攀升，适合长期规划与管理工作。',
  '月宿 Pushya：月亮所在，主智慧滋养，财富积累与精神成长并行。',
];

// ── Component ─────────────────────────────────────────────────────────────

const RightPanel: React.FC<RightPanelProps> = ({
  activeTab: controlledTab,
  onTabChange,
  onExport,
  chartTitle = '印度占星本命盘（Vedic Astrology）',
  birthTime = '1990年05月01日 14:30',
  birthPlace = '北京，中国',
  system = '托勒密宫位（Placidus）',
  planets,
  nakshatras,
  nakshatraExtra,
  dashaTitle = '大运（Dasha）',
  dashaSubtitle = '维姆绍塔屋大运（Vimshottari Dasha）',
  dashaItems,
  summaryTitle = '综合宫位（速览）',
  summaryLines,
  onGenerateReport,
}) => {
  const [internalTab, setInternalTab] = useState<'chart' | 'report'>('chart');

  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: 'chart' | 'report') => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  };

  const planetsLeft = planets ?? DEFAULT_PLANETS_LEFT;
  const planetsRight = nakshatras ?? DEFAULT_PLANETS_RIGHT;
  const extraRows = nakshatraExtra ?? DEFAULT_NAKSHATRA_EXTRA;
  const dashaList = dashaItems ?? DEFAULT_DASHA_ITEMS;
  const summaryTextLines = summaryLines ?? DEFAULT_SUMMARY_LINES;

  return (
    <aside className={styles.panel}>
      {/* ── Tab bar ───────────────────────────────────────────── */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'chart' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('chart')}
            type="button"
          >
            本命盘
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'report' ? styles.tabActive : ''}`}
            onClick={() => handleTabChange('report')}
            type="button"
          >
            综合解读
          </button>
        </div>

        <button
          className={styles.exportBtn}
          onClick={onExport}
          type="button"
          aria-label="一键导出"
        >
          <Download size={14} strokeWidth={2} />
          <span>一键导出</span>
        </button>
      </div>

      {/* ── Scrollable content ───────────────────────────────── */}
      <div className={styles.scrollArea}>
        {activeTab === 'chart' ? (
          <>
            {/* 1. Vedic header */}
            <section className={styles.vedicHeader}>
              <h2 className={styles.chartTitle}>{chartTitle}</h2>
              <p className={styles.infoLine}>
                <span className={styles.infoLabel}>出生时间：</span>
                {birthTime}
              </p>
              <p className={styles.infoLine}>
                <span className={styles.infoLabel}>出生地点：</span>
                {birthPlace}
              </p>
              <p className={styles.infoLine}>
                <span className={styles.infoLabel}>宫位系统：</span>
                {system}
              </p>
            </section>

            {/* 2. Diamond chart */}
            <ChartView />

            {/* 3. Planet positions — two column grid */}
            <section className={styles.planetsSection}>
              {/* Left column: 行星位置 */}
              <div className={styles.tableCol}>
                <p className={styles.colTitle}>行星位置</p>
                <table className={styles.dataTable}>
                  <tbody>
                    {planetsLeft.map((p) => (
                      <tr key={p.abbr} className={styles.dataRow}>
                        <td className={`${styles.cell} ${styles.cellAbbr}`}>{p.abbr}</td>
                        <td className={styles.cell}>{p.name}</td>
                        <td className={styles.cell}>{p.sign}</td>
                        <td className={`${styles.cell} ${styles.cellDegree}`}>{p.degree}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right column: 月宿 */}
              <div className={styles.tableCol}>
                <p className={styles.colTitle}>月宿（Nakshatra）</p>
                <table className={styles.dataTable}>
                  <tbody>
                    {planetsRight.map((p) => (
                      <tr key={p.abbr} className={styles.dataRow}>
                        <td className={`${styles.cell} ${styles.cellAbbr}`}>{p.abbr}</td>
                        <td className={styles.cell}>{p.name}</td>
                        <td className={styles.cell}>{p.sign}</td>
                        <td className={`${styles.cell} ${styles.cellDegree}`}>{p.degree}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Extra nakshatra info */}
                <table className={styles.extraTable}>
                  <tbody>
                    {extraRows.map((row) => (
                      <tr key={row.label} className={styles.extraRow}>
                        <td className={styles.extraLabel}>{row.label}</td>
                        <td className={styles.extraValue}>{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Dasha timeline */}
            <section className={styles.dashaSection}>
              <div className={styles.dashaHeader}>
                <p className={styles.dashaTitle}>{dashaTitle}</p>
                <p className={styles.dashaSubtitle}>{dashaSubtitle}</p>
              </div>
              <div className={styles.dashaTimeline}>
                {dashaList.map((item) => (
                  <div
                    key={item.name}
                    className={`${styles.dashaItem} ${item.active ? styles.dashaItemActive : ''}`}
                  >
                    <p className={styles.dashaName}>{item.name}</p>
                    <p className={styles.dashaDate}>{item.startDate}</p>
                    <p className={styles.dashaDate}>—{item.endDate}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 5. Summary card */}
            <SummaryCard
              title={summaryTitle}
              lines={summaryTextLines}
              actionLabel="立即生成命理报告"
              onAction={onGenerateReport}
            />
          </>
        ) : (
          <div className={styles.reportPlaceholder}>
            <p className={styles.reportText}>综合解读报告即将上线...</p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default RightPanel;
