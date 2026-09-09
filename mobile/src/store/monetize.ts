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

/** Live AdMob interstitial unit (iOS). Dev builds use Google's test unit. */
const INTERSTITIAL_UNIT_ID = "ca-app-pub-9842723539475080/7683530345";

let adFree = false;
let adsInitialized = false;
/**
 * When the held interstitial finished loading. AdMob expires an interstitial
 * roughly an hour after load, and show() on an expired one presents nothing
 * and never reports CLOSED — which is a black screen for as long as the guard
 * in runInterstitial() runs. Refuse anything near that age and reload instead.
 */
let interstitialLoadedAt = 0;
const AD_MAX_AGE_MS = 50 * 60 * 1000;
/** Resolves the promise handed back by runInterstitial(), on CLOSED. */
let closeResolver: (() => void) | null = null;
let removeAdsPrice: string | null = null;
/** Why the last ad load or purchase failed, for the diagnostics line in Settings. */
let lastAdError: string | null = null;
let lastPurchaseError: string | null = null;
let productAvailable = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
/**
 * Teardowns for the listeners on the ad object currently being loaded.
 * addAdEventListener returns an unsubscribe and we used to drop it, so every
 * retry left the previous ad still subscribed. A unit that errors repeatedly
 * then accumulated live ad objects, each able to schedule its own retry.
 */
let adUnsubs: (() => void)[] = [];

function dropAdListeners(): void {
  for (const off of adUnsubs) { try { off(); } catch {} }
  adUnsubs = [];
}
/**
 * Whether we may request personalized ads. On iOS this mirrors the ATT answer;
 * elsewhere Google's UMP consent flow governs it, so we leave it open.
 */
let trackingAuthorized = Platform.OS !== "ios";
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

/** Diagnostics for the Settings panel — why ads or purchases are not working. */
export function monetizeStatus() {
  return {
    adFree,
    adsAvailable: getAds() !== null,
    adsInitialized,
    interstitialReady: interstitial !== null,
    interstitialAgeMs: interstitial === null ? null : Date.now() - interstitialLoadedAt,
    lastAdError,
    purchasesAvailable: getIap() !== null,
    productAvailable,
    removeAdsPrice,
    lastPurchaseError,
  };
}

const ads = (): any | null => getAds();
const iap = (): any | null => getIap();

async function setAdFree(v: boolean): Promise<void> {
  adFree = v;
  // Buying Remove Ads mid-session must not leave a loaded ad or a pending
  // retry behind: adBreakDue() would still refuse it, but holding a live
  // interstitial after the player has paid to be rid of them is wrong.
  if (v) {
    interstitial = null;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    dropAdListeners(); // or an in-flight load would re-arm interstitial after the purchase
  }
  notify();
  try {
    await AsyncStorage.setItem(AD_FREE_KEY, v ? "1" : "0");
  } catch {}
}

/**
 * Load an interstitial and hold it until it is shown.
 *
 * A failed load used to be terminal: there was no ERROR listener, so one
 * transient failure (no fill, no network at launch) left `interstitial` null
 * for the rest of the session and no ad ever appeared again. Failures now back
 * off and retry, and the reason is kept for the diagnostics line in Settings.
 */
function preloadInterstitial(attempt = 0): void {
  const g = ads();
  if (!g || adFree) return;
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  dropAdListeners();
  try {
    const { InterstitialAd, TestIds, AdEventType } = g;
    const unitId = __DEV__ ? TestIds.INTERSTITIAL : INTERSTITIAL_UNIT_ID;
    const ad = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: !trackingAuthorized,
    });
    // Only the ad this call created may drive state. Without the guard a stale
    // object firing late could null a good interstitial or start a second
    // retry chain alongside this one.
    let live = true;
    const own = (type: any, fn: (arg: any) => void) => {
      const off = ad.addAdEventListener(type, (arg: any) => { if (live) fn(arg); });
      adUnsubs.push(() => { live = false; if (typeof off === "function") off(); });
    };
    own(AdEventType.LOADED, () => {
      interstitial = ad;
      interstitialLoadedAt = Date.now();
      lastAdError = null;
      notify();
    });
    own(AdEventType.ERROR, (err: any) => {
      interstitial = null;
      interstitialLoadedAt = 0;
      lastAdError = err?.message ?? String(err ?? "unknown ad load error");
      notify();
      // 8s, 16s, 32s … capped at 5 minutes.
      const delay = Math.min(8000 * Math.pow(2, attempt), 5 * 60 * 1000);
      retryTimer = setTimeout(() => preloadInterstitial(attempt + 1), delay);
    });
    own(AdEventType.CLOSED, () => {
      interstitial = null;
      interstitialLoadedAt = 0;
      const r = closeResolver; closeResolver = null;
      if (r) r();
      preloadInterstitial(); // queue the next one
    });
    ad.load();
  } catch (e: any) {
    lastAdError = e?.message ?? String(e);
    notify();
  }
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
            lastPurchaseError = null;
            await store.finishTransaction({ purchase, isConsumable: false });
            notify();
          }
        } catch (e: any) {
          lastPurchaseError = e?.message ?? String(e);
          notify();
        }
      });
      // Without this, a declined or failed purchase was completely silent: the
      // button returned to idle and nothing told the player what happened.
      store.purchaseErrorListener?.((err: any) => {
        const code = err?.code ?? "";
        // A deliberate cancel is not an error worth reporting back.
        lastPurchaseError = /cancel/i.test(String(code)) ? null : (err?.message ?? String(err));
        notify();
      });
      const products = await store.fetchProducts({ skus: [REMOVE_ADS_SKU], type: "in-app" });
      const p = Array.isArray(products) ? products[0] : null;
      removeAdsPrice = p?.displayPrice ?? p?.localizedPrice ?? null;
      productAvailable = !!p;
      if (!p) {
        lastPurchaseError =
          "The App Store did not return the Remove Ads product. Check that it is created, priced, and in a submittable state in App Store Connect.";
      }
      notify();
    } catch (e: any) {
      lastPurchaseError = e?.message ?? String(e);
      notify();
    }
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
        const res = await getAtt()?.requestTrackingPermissionsAsync();
        trackingAuthorized = res?.status === "granted";
      } catch {}
    }
    await g.default().initialize();
    adsInitialized = true;
    preloadInterstitial();
  } catch {}
}

/**
 * Whether a just-finished game should carry a sponsor break.
 *
 * Every completed game does, provided ads still apply to this player and one
 * is actually loaded. The old rule — never before the second game of a
 * *session* — meant the common case, one long game and then the phone goes
 * down, showed nothing at all: requests outran impressions roughly eight to
 * one. Nothing here is time-based, so a player who finishes two games back to
 * back sees a break after each.
 */
export function adBreakDue(): boolean {
  if (adFree || !adsInitialized || interstitial === null) return false;
  // Deliberately not a pure predicate: a stale ad is dropped here and a fresh
  // one queued, so the game that asked simply goes straight to its results
  // rather than opening a break in front of an ad that cannot appear.
  if (Date.now() - interstitialLoadedAt > AD_MAX_AGE_MS) {
    interstitial = null;
    interstitialLoadedAt = 0;
    lastAdError = "Held interstitial passed its expiry before it could be shown; reloading.";
    notify();
    preloadInterstitial();
    return false;
  }
  return true;
}

/**
 * Show the loaded interstitial, resolving when it closes.
 *
 * Always resolves — a throw from show(), or an SDK that never reports a close,
 * must not strand the player on the sponsor break with their results behind it.
 */
export function runInterstitial(): Promise<void> {
  const ad = interstitial;
  if (!ad) return Promise.resolve();
  return new Promise<void>((resolve) => {
    let done = false;
    let guard: ReturnType<typeof setTimeout>;
    let openWatch: ReturnType<typeof setTimeout> | null = null;
    let offOpened: (() => void) | null = null;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(guard);
      if (openWatch) clearTimeout(openWatch);
      if (offOpened) { try { offOpened(); } catch {} offOpened = null; }
      resolve();
    };
    // If this fires while a real ad is genuinely on screen, resolving is still
    // correct: the results mount behind the ad and are simply there when it
    // closes. 45s was chosen to never cut an ad short and instead became the
    // length of the freeze whenever one failed to report closing.
    guard = setTimeout(finish, 20000);
    // An ad that reaches the screen fires OPENED almost at once. One that does
    // not — an expired creative is the usual reason — fires nothing at all,
    // and waiting out the guard for it shows the player a dead screen for the
    // whole 20s. So watch for OPENED, and if it never comes, conclude the ad
    // is not up and reveal the results. Armed ONLY if the listener actually
    // registered: with no OPENED event to wait for, this timer would cut short
    // every genuine ad instead.
    try {
      const { AdEventType } = ads() ?? {};
      if (AdEventType?.OPENED) {
        const off = ad.addAdEventListener(AdEventType.OPENED, () => {
          if (openWatch) { clearTimeout(openWatch); openWatch = null; }
        });
        if (typeof off === "function") offOpened = off;
      }
    } catch {}
    if (offOpened) {
      openWatch = setTimeout(() => {
        lastAdError = "show() reported no OPENED within 3s; treated as never shown.";
        notify();
        finish();
        preloadInterstitial(); // the one we just dropped is gone either way
      }, 3000);
    }
    closeResolver = finish;
    try {
      interstitial = null;
      interstitialLoadedAt = 0;
      ad.show();
    } catch {
      closeResolver = null;
      finish();
    }
  });
}

/** Buy Remove Ads. Resolves when the request is submitted; the listener flips the flag. */
export async function buyRemoveAds(): Promise<void> {
  const store = iap();
  if (!store) throw new Error("Purchases are unavailable in this build.");
  if (!productAvailable) {
    throw new Error(
      "The App Store has not returned this product. It may not be approved for sale yet, or the device is not signed in to a store account that can buy it.",
    );
  }
  lastPurchaseError = null;
  notify();
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
