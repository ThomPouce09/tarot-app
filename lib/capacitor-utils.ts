/**
 * Capacitor platform detection and native API helpers
 * Used by the APK build to switch between Web and native Android APIs
 */

export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  if (!cap) return false;
  // Capacitor 8: `isNativePlatform()` is a FUNCTION; the old `isNative`
  // boolean property was removed. Supporting both keeps compat.
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  return !!cap.isNative;
}

export function getPlatform(): 'web' | 'android' | 'ios' {
  if (typeof window === 'undefined') return 'web';
  const cap = (window as any).Capacitor;
  if (!cap) return 'web';
  const isNative =
    typeof cap.isNativePlatform === 'function' ? cap.isNativePlatform() : !!cap.isNative;
  if (!isNative) return 'web';
  const platform = cap.getPlatform?.() || 'web';
  return platform === 'android' ? 'android' : platform === 'ios' ? 'ios' : 'web';
}

/**
 * Share using Capacitor Share plugin with fallback to Web Share API
 */
export async function shareViaCapacitor(title: string, text: string, url?: string): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }
  // Web fallback
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch {
      return false;
    }
  }
  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the base URL for API calls.
 * In development: uses NEXT_PUBLIC_API_URL or empty (same-origin)
 * In production APK: uses a Vercel/remote backend URL
 */
export function getApiBaseUrl(): string {
  if (isNative()) {
    // APK production — must point to a live backend
    return process.env.NEXT_PUBLIC_API_URL || 'https://tarot-app-one-sage.vercel.app';
  }
  // Web dev/prod — same origin
  return process.env.NEXT_PUBLIC_API_URL || '';
}
