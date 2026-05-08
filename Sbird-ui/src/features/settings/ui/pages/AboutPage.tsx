import React from 'react';
import { ExternalLink, Heart, Github, Globe } from 'lucide-react';
import styles from './AboutPage.module.scss';

const TECH_STACK = [
  { name: 'React', version: '18.x' },
  { name: 'TypeScript', version: '5.6' },
  { name: 'Vite', version: '6.x' },
  { name: 'SCSS Modules', version: '' },
  { name: 'Lucide Icons', version: '' },
];

const LINKS = [
  { label: '官方网站', href: '#', icon: Globe },
  { label: 'GitHub 仓库', href: '#', icon: Github },
];

const AboutPage: React.FC = () => {
  return (
    <div className={styles.aboutPage}>
      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.logoContainer}>
          <svg width={48} height={48} viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path
              d="M8 4L16 8L24 4L28 12L24 20L16 28L8 20L4 12L8 4Z"
              fill="#7C5CFC"
              stroke="#7C5CFC"
              strokeWidth="1"
            />
            <path d="M12 8L16 10L20 8L22 14L16 20L10 14L12 8Z" fill="#A78BFA" />
          </svg>
        </div>
        <h2 className={styles.appName}>Sbird 魔鸟</h2>
        <span className={styles.version}>v0.1.0-alpha</span>
        <p className={styles.tagline}>AI Agent 实时工作台</p>
      </div>

      {/* Info Grid */}
      <div className={styles.infoGrid}>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>构建版本</span>
          <span className={styles.infoValue}>2026.05.08</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>运行时</span>
          <span className={styles.infoValue}>浏览器</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>架构</span>
          <span className={styles.infoValue}>SPA + SSE</span>
        </div>
        <div className={styles.infoCard}>
          <span className={styles.infoLabel}>许可证</span>
          <span className={styles.infoValue}>Private</span>
        </div>
      </div>

      {/* Tech Stack */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>技术栈</h3>
        <div className={styles.techList}>
          {TECH_STACK.map((tech) => (
            <div key={tech.name} className={styles.techItem}>
              <span className={styles.techName}>{tech.name}</span>
              {tech.version && (
                <span className={styles.techVersion}>{tech.version}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>链接</h3>
        <div className={styles.linkList}>
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={styles.linkItem}
              target="_blank"
              rel="noopener noreferrer"
            >
              <link.icon size={15} />
              <span>{link.label}</span>
              <ExternalLink size={12} className={styles.linkExternal} />
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <p>
          用 <Heart size={12} className={styles.heartIcon} fill="currentColor" /> 构建
        </p>
        <p className={styles.copyright}>© 2026 Sbird. All rights reserved.</p>
      </div>
    </div>
  );
};

export default AboutPage;
