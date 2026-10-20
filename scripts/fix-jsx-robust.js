const fs = require('fs');

let content = fs.readFileSync('src/components/operations/role-portal-screen.tsx', 'utf8');

// Replace the lines around 1582-1621
const target = `            <div className={styles.contentWrap}>
              {activeTab !== "ledgers" && (
              <h2 className={styles.sectionTitle}>{config.heroTitle[activeTab]}</h2>
              <p className={styles.sectionSub}>{config.heroSubtitle[activeTab]}</p>

              {error && (
                <div
                  className={styles.notice}
                  style={{ background: "#fee2e2", borderColor: "#ef4444" }}
                >
                  <p
                    className={styles.noticeTitle}
                    style={{ color: "#dc2626" }}
                  >
                    Error:
                  </p>
                  <p style={{ color: "#dc2626" }}>{error}</p>
                </div>
              )}

              {/* KPI Cards */}
              <div className={styles.kpiGrid}>
                {currentKpis.map((kpi, index) => (
                  <article
                    key={kpi.label}
                    className={styles.kpiCard}
                    style={{ animationDelay: \`\${index * 80}ms\` }}
                  >
                    <div className={styles.kpiRow}>
                      {kpi.icon ? <span className={styles.activityIcon}>{kpi.icon}</span> : <span />}
                      {kpi.delta ? <span className={styles.deltaBadge}>{kpi.delta}</span> : <span />}
                    </div>
                    <p className={styles.kpiValue}>{kpi.value}</p>
                    <p className={styles.kpiLabel}>{kpi.label}</p>
                  </article>
                ))}
              </div>

              )}`;

const replacement = `            <div className={styles.contentWrap}>
              {activeTab !== "ledgers" && (
                <>
                  <h2 className={styles.sectionTitle}>{config.heroTitle[activeTab]}</h2>
                  <p className={styles.sectionSub}>{config.heroSubtitle[activeTab]}</p>

                  {error && (
                    <div
                      className={styles.notice}
                      style={{ background: "#fee2e2", borderColor: "#ef4444" }}
                    >
                      <p
                        className={styles.noticeTitle}
                        style={{ color: "#dc2626" }}
                      >
                        Error:
                      </p>
                      <p style={{ color: "#dc2626" }}>{error}</p>
                    </div>
                  )}

                  {/* KPI Cards */}
                  <div className={styles.kpiGrid}>
                    {currentKpis.map((kpi, index) => (
                      <article
                        key={kpi.label}
                        className={styles.kpiCard}
                        style={{ animationDelay: \`\${index * 80}ms\` }}
                      >
                        <div className={styles.kpiRow}>
                          {kpi.icon ? <span className={styles.activityIcon}>{kpi.icon}</span> : <span />}
                          {kpi.delta ? <span className={styles.deltaBadge}>{kpi.delta}</span> : <span />}
                        </div>
                        <p className={styles.kpiValue}>{kpi.value}</p>
                        <p className={styles.kpiLabel}>{kpi.label}</p>
                      </article>
                    ))}
                  </div>
                </>
              )}`;

const normalized = content.replace(/\r\n/g, '\n');
const targetNorm = target.replace(/\r\n/g, '\n');

if (normalized.includes(targetNorm)) {
  const result = normalized.replace(targetNorm, replacement);
  fs.writeFileSync('src/components/operations/role-portal-screen.tsx', result, 'utf8');
  console.log('REPLACED SUCCESSFUL!');
} else {
  console.log('TARGET NOT FOUND, trying split index approach...');
  const lines = normalized.split('\n');
  const startIdx = lines.findIndex(l => l.includes('{activeTab !== "ledgers" && ('));
  console.log('startIdx:', startIdx);
  if (startIdx !== -1) {
    // Find the matching close
    let closeIdx = -1;
    for (let i = startIdx; i < startIdx + 50; i++) {
      if (lines[i].trim() === ')}') {
        closeIdx = i;
        break;
      }
    }
    console.log('closeIdx:', closeIdx);
    if (closeIdx !== -1) {
      lines[startIdx] = '              {activeTab !== "ledgers" && (<>';
      lines[closeIdx] = '              </>)}';
      fs.writeFileSync('src/components/operations/role-portal-screen.tsx', lines.join('\n'), 'utf8');
      console.log('REPLACED WITH INDEX SUCCESSFUL!');
    }
  }
}
