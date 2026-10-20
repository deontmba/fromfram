const fs = require('fs');

let code = fs.readFileSync('src/components/operations/role-portal-screen.tsx', 'utf8');

// 1. Add import
if (!code.includes('AdminPencatatanTab')) {
  code = code.replace(
    'import { AdminIngredientsTab } from "./tabs/AdminIngredientsTab";',
    'import { AdminIngredientsTab } from "./tabs/AdminIngredientsTab";\nimport { AdminPencatatanTab } from "./tabs/AdminPencatatanTab";'
  );
}

// 2. Add tab to adminConfig
if (!code.includes('{ id: "ledgers", label: "Pencatatan" }')) {
  code = code.replace(
    '{ id: "reports", label: "Prediksi AI" },',
    '{ id: "reports", label: "Prediksi AI" },\n    { id: "ledgers", label: "Pencatatan" },'
  );
}

// 3. Add heroTitle & heroSubtitle
if (!code.includes('ledgers: "Dasbor Pencatatan",')) {
  code = code.replace(
    'reports: "Prediksi Kebutuhan Pasokan",',
    'reports: "Prediksi Kebutuhan Pasokan",\n    ledgers: "Dasbor Pencatatan",'
  );
}

if (!code.includes('ledgers: "Kelola alur transaksi pesanan,')) {
  code = code.replace(
    'reports: "Pantau estimasi kebutuhan bahan baku dan buat Purchase Order ke petani mitra secara otomatis.",',
    'reports: "Pantau estimasi kebutuhan bahan baku dan buat Purchase Order ke petani mitra secara otomatis.",\n    ledgers: "Kelola alur transaksi pesanan, penerimaan bahan baku, serta log harian operasional.",'
  );
}

// 4. Render AdminPencatatanTab when activeTab === 'ledgers'
if (!code.includes('activeTab === "ledgers"')) {
  code = code.replace(
    '{role === "admin" && activeTab === "ingredients" ? (',
    `{role === "admin" && activeTab === "ledgers" ? (
                <div style={{ marginTop: "1rem" }}>
                  <AdminPencatatanTab />
                </div>
              ) : null}

              {role === "admin" && activeTab === "ingredients" ? (`
  );
}

// 5. Hide the outer KPI grid and hero text when on ledgers tab so the custom UI matches Figma exactly
if (!code.includes('activeTab !== "ledgers" && (')) {
  code = code.replace(
    '<div className={styles.contentWrap}>',
    '<div className={styles.contentWrap}>\n              {activeTab !== "ledgers" && ('
  );

  code = code.replace(
    '{isLoading && (',
    ')}\n\n              {isLoading && ('
  );
}

fs.writeFileSync('src/components/operations/role-portal-screen.tsx', code, 'utf8');
console.log('Successfully updated role-portal-screen.tsx');
