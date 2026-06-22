import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { t } from '../../lib/i18n';
import { Camera } from 'lucide-react';
import ScannerModal from '../ui/ScannerModal';

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InventoryTab() {
  const inventory = useStore((s) => s.inventory);
  const addInventory = useStore((s) => s.addInventory);
  const deleteInventory = useStore((s) => s.deleteInventory);

  const [inventoryName, setInventoryName] = useState('');
  const [inventoryPrice, setInventoryPrice] = useState('');
  const [inventoryStock, setInventoryStock] = useState('');
  const [inventorySku, setInventorySku] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = (result: string) => {
    setInventorySku(result.trim());
  };

  const handleAddInventory = () => {
    if (!inventoryName || !inventoryPrice || !inventoryStock || !inventorySku) return;
    addInventory({
      id: Date.now().toString(),
      name: inventoryName,
      price: parseFloat(inventoryPrice),
      stock: parseInt(inventoryStock),
      sku: inventorySku,
    });
    setInventoryName('');
    setInventoryPrice('');
    setInventoryStock('');
    setInventorySku('');
  };

  const handleDeleteInventory = (id: string) => {
    if (confirm('Delete this inventory item?')) deleteInventory(id);
  };

  return (
    <div className="glass p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">{t('inventory.title').replace('{count}', String(inventory.length))}</h2>
        <button onClick={() => downloadCSV('inventory.csv', [['ID','Name','Price','Stock','SKU'], ...inventory.map(i => [i.id, i.name, String(i.price), String(i.stock), i.sku])])} className="btn btn-secondary text-xs">{t('inventory.csvExport')}</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {inventory.map(i => (
          <div key={i.id} className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm">
            <span className="text-white">{i.name}</span>
            <span className="text-[#94a3b8] text-xs">₹{i.price} &middot; {i.stock}pcs</span>
            <span className="text-[#94a3b8] text-xs">SKU: {i.sku}</span>
            <button onClick={() => handleDeleteInventory(i.id)} className="text-red-400 hover:text-red-300 text-xs ml-1">&times;</button>
          </div>
        ))}
        {inventory.length === 0 && <p className="text-[#94a3b8] text-sm">{t('inventory.noItems')}</p>}
      </div>
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-sm font-medium text-white mb-3">{t('inventory.addItem')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <input placeholder={t('users.name')} value={inventoryName} onChange={e => setInventoryName(e.target.value)} />
          <input type="number" placeholder="Price" value={inventoryPrice} onChange={e => setInventoryPrice(e.target.value)} />
          <input type="number" placeholder="Stock" value={inventoryStock} onChange={e => setInventoryStock(e.target.value)} />
          <input placeholder="SKU" value={inventorySku} onChange={e => setInventorySku(e.target.value)} />
          <button onClick={() => setScannerOpen(true)} className="btn btn-secondary text-xs flex items-center gap-1">
            <Camera size={14} /> Scan
          </button>
        </div>
        <button onClick={handleAddInventory} className="btn btn-primary mt-3 text-sm">{t('inventory.add')}</button>
      </div>
      <ScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onScan={handleScan} />
    </div>
  );
}
