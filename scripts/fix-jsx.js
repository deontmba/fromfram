const fs = require('fs');

let code = fs.readFileSync('src/components/operations/role-portal-screen.tsx', 'utf8');

// Wrap in React Fragment <> ... </> inside activeTab !== "ledgers"
code = code.replace(
  `            <div className={styles.contentWrap}>
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

              )}`,
  `            <div className={styles.contentWrap}>
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
              )}`
);

fs.writeFileSync('src/components/operations/role-portal-screen.tsx', code, 'utf8');
console.log('Fixed JSX fragment in role-portal-screen.tsx');
