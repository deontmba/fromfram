import React from 'react';
import styles from '../operations/role-portal-screen.module.css';

export function ConfidenceBadge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const tone = percentage >= 80 ? styles.tagGreen : percentage >= 60 ? styles.tagAmber : styles.tagRed;
  const lowData = percentage < 70;

  return (
    <span
      className={`${styles.tag} ${tone}`}
      title={lowData ? 'Data historis masih sedikit, akurasi akan meningkat seiring waktu.' : undefined}
    >
      {percentage}%
    </span>
  );
}
