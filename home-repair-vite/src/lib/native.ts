import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';

export async function takePhoto(): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 80,
    });
    return photo.dataUrl || null;
  } catch {
    return null;
  }
}

export async function getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export async function shareContent(title: string, text: string, url?: string) {
  try {
    await Share.share({ title, text, url });
  } catch {
    console.warn('[native] Share was cancelled or failed');
  }
}
