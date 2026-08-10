// Ads + the Remove Ads purchase.
//
// All native modules (google-mobile-ads, expo-iap, tracking-transparency) are
// lazy-required and guarded: on web, in Expo Go, or in any build where the
// native side is missing, every function quietly no-ops and the app behaves
// as ad-free. Real behavior requires an EAS build.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getAds, getAtt, getIap } from "./native-mods";

const AD_FREE_KEY = "buyout.adfree.v1";
export const REMOVE_ADS_SKU = "com.jordanyeats.buyout.removeads";

/** Minimum gap between interstitials, and never after the first game of a session. */
const INTERSTITIAL_GAP_MS = 8 * 60 * 1000;

let adFree = false;
let adsInitialized = false;
let lastInterstitialAt = 0;
let gamesFinishedThisSession = 0;
let removeAdsPrice: string | null = null;
let interstitial: any = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

/** Subscribe to ad-free state changes; returns unsubscribe. */
export function onMonetizeChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isAdFree(): boolean {
  return adFree;
}

export function getRemoveAdsPrice(): string | null {
  return removeAdsPrice;
}

const ads = (): any | null => getAds();
const iap = (): any | null => getIap();

async function setAdFree(v: boolean): Promise<void> {
  adFree = v;
  notify();
  try {
    await AsyncStorage.setItem(AD_FREE_KEY, v ? "1" : "0");
  } catch {}
}

function preloadInterstitial(): void {
  const g = ads();
  if (!g || adFree) return;
  try {
    const { InterstitialAd, TestIds, AdEventType } = g;
    // TODO(release): replace TestIds.INTERSTITIAL with the real AdMob unit id.
    const ad = InterstitialAd.createForAdRequest(TestIds.INTERSTITIAL, {
      requestNonPersonalizedAdsOnly: true,
    });
    ad.addAdEventListener(AdEventType.LOADED, () => {
      interstitial = ad;
    });
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      interstitial = null;
      preloadInterstitial(); // queue the next one
    });
    ad.load();
  } catch {}
}

/**
 * One-time startup: restore the ad-free flag, then (if ads apply) run the
 * consent + ATT + SDK-init chain and preload an interstitial.
 */
export async function initMonetize(): Promise<void> {
  try {
    adFree = (await AsyncStorage.getItem(AD_FREE_KEY)) === "1";
  } catch {}
  notify();

  // IAP connection + price + quiet entitlement check.
  const store = iap();
  if (store) {
    try {
      await store.initConnection();
      store.purchaseUpdatedListener(async (purchase: any) => {
        try {
          if (purchase?.productId === REMOVE_ADS_SKU) {
            await setAdFree(true);
            await store.finishTransaction({ purchase, isConsumable: false });
          }
        } catch {}
      });
      const products = await store.fetchProducts({ skus: [REMOVE_ADS_SKU], type: "in-app" });
      const p = Array.isArray(products) ? products[0] : null;
      removeAdsPrice = p?.displayPrice ?? p?.localizedPrice ?? null;
      notify();
    } catch {}
  }
  if (adFree) return;

  const g = ads();
  if (!g) return;
  try {
    // EU consent (UMP) first, where required.
    try {
      const { AdsConsent } = g;
      await AdsConsent.requestInfoUpdate();
      await AdsConsent.loadAndShowConsentFormIfRequired();
    } catch {}
    // ATT prompt (iOS).
    if (Platform.OS === "ios") {
      try {
        await getAtt()?.requestTrackingPermissionsAsync();
      } catch {}
    }
    await g.default().initialize();
    adsInitialized = true;
    preloadInterstitial();
  } catch {}
}

/**
 * Show an interstitial if the moment is right: ads on, one is loaded, at
 * least one full game already finished this session, and the frequency cap
 * has cooled down. Call when the Final Edition is dismissed.
 */
export function maybeShowInterstitial(): void {
  gamesFinishedThisSession += 1;
  if (adFree || !adsInitialized || !interstitial) return;
  if (gamesFinishedThisSession < 2) return; // never after the first game
  const now = Date.now();
  if (now - lastInterstitialAt < INTERSTITIAL_GAP_MS) return;
  try {
    lastInterstitialAt = now;
    interstitial.show();
    interstitial = null;
  } catch {}
}

/** Buy Remove Ads. Resolves when the request is submitted; the listener flips the flag. */
export async function buyRemoveAds(): Promise<void> {
  const store = iap();
  if (!store) throw new Error("Purchases are unavailable in this build.");
  await store.requestPurchase({ request: { apple: { sku: REMOVE_ADS_SKU } }, type: "in-app" });
}

/** Restore a prior Remove Ads purchase. Returns true if found. */
export async function restorePurchases(): Promise<boolean> {
  const store = iap();
  if (!store) throw new Error("Purchases are unavailable in this build.");
  try {
    await store.restorePurchases();
  } catch {}
  const owned = await store.getAvailablePurchases();
  const has = Array.isArray(owned) && owned.some((p: any) => p?.productId === REMOVE_ADS_SKU);
  if (has) await setAdFree(true);
  return has;
}
