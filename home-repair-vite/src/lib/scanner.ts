import { Html5Qrcode } from 'html5-qrcode';

let scanner: Html5Qrcode | null = null;

function getScanner(): Html5Qrcode {
  if (!scanner) {
    scanner = new Html5Qrcode('scanner-element');
  }
  return scanner;
}

export async function scanBarcode(): Promise<string | null> {
  const s = getScanner();
  try {
    await s.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      () => {},
      () => {},
    );
    return await new Promise<string | null>((resolve) => {
      s.stop().catch(() => {});
      resolve(null);
    });
  } catch {
    return null;
  }
}

export async function startScanner(
  onResult: (text: string) => void,
  onError?: (err: string) => void,
): Promise<void> {
  const s = getScanner();
  try {
    await s.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        onResult(decodedText);
        s.stop().catch(() => {});
      },
      (errorMessage) => {
        onError?.(errorMessage);
      },
    );
  } catch (err) {
    onError?.(String(err));
  }
}

export async function stopScanner(): Promise<void> {
  if (scanner) {
    try {
      await scanner.stop();
    } catch {
      // scanner already stopped
    }
  }
}

export function cleanupScanner(): void {
  if (scanner) {
    scanner.stop().catch(() => {});
    scanner = null;
  }
}
