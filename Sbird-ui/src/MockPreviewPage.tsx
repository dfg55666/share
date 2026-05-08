import { useState } from 'react';
import WorkbenchShell from './features/session/ui/WorkbenchShell';
import { WorkbenchSidebar } from './features/threads';
import { ChatHeader, ChatTimeline, ChatComposerPanel } from './features/chat';
import { RightPanel } from './features/panel';

import type { NavItem, ThreadGroup, Subject, UserInfo } from './features/threads';

// ── Mock Data ──────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: 'home', active: true },
  { id: 'agents', label: 'Agents', icon: 'bot' },
  { id: 'workflows', label: 'Workflows', icon: 'workflow' },
  { id: 'knowledge', label: 'Knowledge', icon: 'book-open' },
];

const THREAD_GROUPS: ThreadGroup[] = [
  {
    label: '八字',
    threads: [
      { id: 't1', title: '男 - 财富事业分析', active: true },
      { id: 't2', title: '女 - 2026 流年详批' },
    ],
  },
  {
    label: '紫微斗数',
    threads: [
      { id: 't3', title: '命盘详解（示例）' },
      { id: 't4', title: '事业官禄宫解析' },
      { id: 't5', title: '2028 流年运势' },
    ],
  },
];

const SUBJECTS: Subject[] = [
  { id: 's1', name: '张 三（卯）', initial: '张', color: 'purple' },
  { id: 's2', name: '李 四（卯）', initial: '李', color: 'green' },
  { id: 's3', name: '王 五（柱）', initial: '王', color: 'blue' },
];

const USER: UserInfo = {
  name: 'Kate Morrison',
  role: '高级版用户',
  avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
};

const AGENTS = [
  { id: 'a1', name: '紫微分析', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face' },
  { id: 'a2', name: '大运流年', avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=60&h=60&fit=crop&crop=face' },
  { id: 'a3', name: '实务助手' },
  { id: 'a-add', name: '添加', isAdd: true },
];

const MESSAGES = [
  {
    id: 'm1',
    role: 'user' as const,
    senderName: '你',
    time: '10:42',
    content: '请结合合盘，给我一个简洁的财富事业建议。',
  },
  {
    id: 'm2',
    role: 'agent' as const,
    senderName: '玄极助手',
    senderTag: 'Agent',
    time: '10:43',
    content: '从命盘看，你的财富增长更适合走稳健积累与专业深耕路线。\n未来几年事业上有明显上升窗口，建议重点抓住资源整合、专业变现与长期布局。',
    thinking: {
      steps: [
        { text: '已解析命盘结构、十神配置、格局与用忌神。' },
        { text: '结合大运流年趋势，评估财富与事业发展窗口期。' },
      ],
      toolCalls: [
        { label: '调用工具：大运流年推演引擎', name: 'fortune_engine.v1', status: 'success' as const },
      ],
    },
  },
];

// Right panel mock data
const PLANETS = [
  { abbr: 'Asc', name: '上升', sign: '白羊座', degree: "16°47'" },
  { abbr: 'Su', name: '太阳', sign: '金牛座', degree: "09°15'" },
  { abbr: 'Mo', name: '月亮', sign: '巨蟹座', degree: "27°56'" },
  { abbr: 'Me', name: '水星', sign: '狮子座', degree: "10°02'" },
  { abbr: 'Ve', name: '金星', sign: '财帛宫', degree: "23°17'" },
];

const NAKSHATRAS = [
  { abbr: 'Ma', name: '火星', sign: '双子座', degree: "12°47'" },
  { abbr: 'Ju', name: '木星', sign: '射手座', degree: "15°03'" },
  { abbr: 'Sa', name: '土星', sign: '摩羯座', degree: "07°26'" },
  { abbr: 'Ra', name: '罗睺', sign: '双子座', degree: "02°19'" },
  { abbr: 'Ke', name: '计都', sign: '射手座', degree: "02°19'" },
];

const NAKSHATRA_EXTRA = [
  { label: '月亮所前', value: 'Pushya' },
  { label: '黄道区', value: 'Rohini' },
  { label: '四柱', value: "2'" },
  { label: '计算师', value: 'Rahasgari' },
  { label: '经建', value: '紫淳, 泛淳' },
];

const DASHA_ITEMS = [
  { name: '火星大运', startDate: '2025-05-20', endDate: '2032-05-20', active: true },
  { name: '罗睺大运', startDate: '2032-05-20', endDate: '2050-05-20' },
  { name: '木星大运', startDate: '2050-05-20', endDate: '2066-05-20' },
  { name: '土星大运', startDate: '2066-05-20', endDate: '2085-05-20' },
  { name: '水星大运', startDate: '2085-05-20', endDate: '2102-05-20' },
];

const SUMMARY_LINES = [
  '命盘上升白羊，火星能量强，行动力与竞争意识突出。',
  '财运主在田地暨章则，适合长期主义积则：注意风险管控与反复验证。',
  '未来事业长期在（2023-2041）结合自身优势论，注重专业深耕与合盈。',
];

// ── Page ───────────────────────────────────────────────────────────

export const MockPreviewPage: React.FC = () => {
  const [activeNav, setActiveNav] = useState('home');
  const [activeThread, setActiveThread] = useState('t1');

  const navItems = NAV_ITEMS.map((n) => ({ ...n, active: n.id === activeNav }));
  const threadGroups = THREAD_GROUPS.map((g) => ({
    ...g,
    threads: g.threads.map((t) => ({ ...t, active: t.id === activeThread })),
  }));

  // ── Sidebar ──
  const sidebar = (
    <WorkbenchSidebar
      navItems={navItems}
      threadGroups={threadGroups}
      subjects={SUBJECTS}
      user={USER}
      onNavSelect={setActiveNav}
      onThreadSelect={setActiveThread}
      onSubjectAdd={() => {}}
      onCollapse={() => {}}
      onSearch={() => {}}
    />
  );

  // ── Chat ──
  const chat = (
    <>
      <ChatHeader
        title="男 - 财富事业分析"
        sessionId="会话 ID: BF-20240528-001"
        agents={AGENTS}
      />
      <ChatTimeline messages={MESSAGES} />
      <ChatComposerPanel
        onSend={(text) => console.log('Send:', text)}
      />
    </>
  );

  // ── Right Panel ──
  const panel = (
    <RightPanel
      chartTitle="印度占星本命盘（Vedic Astrology）"
      birthTime="1993-05-20  10:30（当地时间）"
      birthPlace="北京，中国"
      system="拉希占星 - Lahiri (Ayanamsa)"
      planets={PLANETS}
      nakshatras={NAKSHATRAS}
      nakshatraExtra={NAKSHATRA_EXTRA}
      dashaTitle="大运（Dasha）"
      dashaSubtitle="维姆绍塔屋大运（Vimshottari Dasha）"
      dashaItems={DASHA_ITEMS}
      summaryTitle="综合宫位（速览）"
      summaryLines={SUMMARY_LINES}
      onGenerateReport={() => {}}
    />
  );

  return (
    <WorkbenchShell sidebar={sidebar} chat={chat} panel={panel} />
  );
};
