const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/operations/tabs/AdminPencatatanTab.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const regex = /(<span className="font-semibold">\{selectedTx\.user\?\.name \|\| "-"\} \(\{selectedTx\.user\?\.email \|\| "-"\}\)<\/span>\s*<\/div>)/;

if (regex.test(content)) {
  content = content.replace(regex, `$1\n              <div className="flex justify-between py-1 border-b border-slate-50">\n                <span className="text-slate-400">Jenis Subscription</span>\n                <span className="font-semibold text-slate-800">{getSubscriptionLabel(selectedTx)}</span>\n              </div>`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated selectedTx detail modal with Jenis Subscription');
} else {
  console.log('Regex not matched');
}
