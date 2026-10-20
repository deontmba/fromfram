const fs = require('fs');

let code = fs.readFileSync('src/components/operations/tabs/AdminPencatatanTab.tsx', 'utf8');

// Replace the column cell rendering for Pemasok / Sumber and Komoditas & Varian
const target = `                        <td className="p-3.5 font-medium text-slate-800">
                          {isEditAdmin ? (ing.ingredient?.supplierName || "Admin Warehouse") : (ing.user?.name || "Pelanggan")}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#0f172a]">{ing.ingredient?.name || "-"}</div>
                          <div className="text-[10px] text-slate-400">{ing.menuName || ing.notes || "-"}</div>
                        </td>`;

const replacement = `                        <td className="p-3.5 font-medium text-slate-800">
                          {isEditAdmin ? (
                            <div>
                              <div className="font-semibold text-slate-800">{ing.ingredient?.supplierName || "Admin Warehouse"}</div>
                              {ing.ingredient?.origin && ing.ingredient.origin !== "-" && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <span>📍</span> {ing.ingredient.origin}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-800">{ing.user?.name || "Pelanggan"}</div>
                              <div className="text-[10px] text-slate-400">Konsumen Langganan</div>
                            </div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-[#0f172a] text-sm">{ing.ingredient?.name || "-"}</div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {isEditAdmin ? (ing.notes || "Penyesuaian stok langsung oleh Admin") : (ing.menuName ? \`Bahan resep: \${ing.menuName}\` : (ing.notes || "Penggunaan bahan resep pesanan"))}
                          </div>
                        </td>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/operations/tabs/AdminPencatatanTab.tsx', code, 'utf8');
  console.log('SUCCESSFULLY REPLACED TABLE CELLS IN AdminPencatatanTab.tsx');
} else {
  console.error('TARGET STRING NOT FOUND IN AdminPencatatanTab.tsx');
}
