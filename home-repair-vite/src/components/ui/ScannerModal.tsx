import { useEffect, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { startScanner, stopScanner } from '../../lib/scanner';

interface ScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
}

export default function ScannerModal({ open, onClose, onScan }: ScannerModalProps) {
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) {
      stopScanner();
      setError('');
      setScanning(false);
      return;
    }
    setScanning(true);
    startScanner(
      (text) => {
        onScan(text);
        onClose();
      },
      (err) => {
        setError(err);
        setScanning(false);
      },
    );
    return () => { stopScanner(); };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Camera size={18} className="text-indigo-400" /> Scan Barcode
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X size={20} className="text-[#94a3b8]" />
          </button>
        </div>
        <div id="scanner-element" className="w-full aspect-video bg-black rounded-xl overflow-hidden" />
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {scanning && <p className="text-[#94a3b8] text-xs mt-2 text-center">Point camera at a barcode or QR code</p>}
      </div>
    </div>
  );
}
