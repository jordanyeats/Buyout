import React, { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { BD, INK3, SANS } from "../theme";
import { isAdFree, onMonetizeChange } from "../store/monetize";
import { getAds } from "../store/native-mods";

/**
 * A broadsheet advertisement slot: small-caps "Advertisement" label over a
 * banner, framed in hairline rules like a classified. Renders nothing when
 * ads are removed or the native ads module is unavailable (web, Expo Go).
 */
export function AdSlot() {
  const [adFree, setAdFree] = useState(isAdFree());
  useEffect(() => onMonetizeChange(() => setAdFree(isAdFree())), []);
  if (adFree || Platform.OS === "web") return null;

  const g = getAds();
  if (!g?.BannerAd) return null;
  const { BannerAd: Banner, TestIds, BannerAdSize } = g;

  return (
    <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: BD, borderBottomWidth: 1, borderBottomColor: BD, paddingVertical: 8, alignItems: "center" }}>
      <Text style={{ fontFamily: SANS, fontSize: 8, letterSpacing: 2.5, textTransform: "uppercase", color: INK3, marginBottom: 6 }}>
        Advertisement
      </Text>
      <Banner
        // TODO(release): replace TestIds.ADAPTIVE_BANNER with the real AdMob unit id.
        unitId={TestIds.ADAPTIVE_BANNER}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
