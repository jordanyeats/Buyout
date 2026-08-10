// Native-module access, split by platform. Metro picks native-mods.web.ts on
// web, so the web bundle never references the native-only packages.
export function getAds(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-google-mobile-ads");
  } catch {
    return null;
  }
}
export function getIap(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-iap");
  } catch {
    return null;
  }
}
export function getAtt(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("expo-tracking-transparency");
  } catch {
    return null;
  }
}
