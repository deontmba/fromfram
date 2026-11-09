const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/operations/tabs/AdminPencatatanTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const helperFunc = `
function getSubscriptionLabel(tx: TransactionLedgerItem) {
  const plan = tx.metadata?.planType || tx.user?.subscriptions?.[0]?.planType;
  if (!plan) return 'Paket Mingguan';
  const upper = String(plan).toUpperCase();
  if (upper.includes('BULAN')) return 'Paket Bulanan';
  if (upper.includes('TAHUN')) return 'Paket Tahunan';
  return 'Paket Mingguan';
}
`;

if (!content.includes('function getSubscriptionLabel')) {
  content = content.replace('export function AdminPencatatanTab()', helperFunc + '\nexport function AdminPencatatanTab()');
  console.log('Added getSubscriptionLabel helper');
}

// Normalize CRLF to LF for matching, or match regex
// 1. Table headers
content = content.replace(
  /<th className="p-3\.5">Kategori & Komoditas<\/th>\s*<th className="p-3\.5 text-center">Volume<\/th>/,
  '<th className="p-3.5 text-center">Jenis Subscription</th>'
);
console.log('Replaced table header');

// 2. ColSpan
content = content.replace(/colSpan=\{8\}/g, 'colSpan={7}');
console.log('Updated colSpan to 7');

// 3. Table body cells
content = content.replace(
  /<td className="p-3\.5 font-medium text-slate-600">\s*\{tx\.metadata\?\.category \|\| "Paket Meal Kit Mingguan"\}\s*<\/td>\s*<td className="p-3\.5 text-center font-medium text-slate-600">\s*\{tx\.metadata\?\.volume \|\| "1 Box"\}\s*<\/td>/,
  `<td className="p-3.5 text-center font-medium text-slate-700">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {getSubscriptionLabel(tx)}
                          </span>
                        </td>`
);
console.log('Replaced table cells');

// 4. Excel export
content = content.replace(
  /"Pelanggan": tx\.user\?\.name \|\| "-",/,
  `"Pelanggan": tx.user?.name || "-",\n      "Jenis Subscription": getSubscriptionLabel(tx),`
);
console.log('Updated Excel export');

fs.writeFileSync(filePath, content, 'utf8');
console.log('File successfully written!');
