import React, { useState } from 'react';
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import {
    BannerAdSize,
    GAMBannerAd
} from 'react-native-google-mobile-ads';

interface NativeAdProps {
  adUnitId?: string;
  style?: any;
}

// ✅ Correct Google Test Native Ad IDs
const NATIVE_AD_TEST_IDS = {
  ios: 'ca-app-pub-3940256099942544/3986624511',
  android: 'ca-app-pub-3940256099942544/2247696110',
};

/**
 * ✅ WORKING NATIVE AD COMPONENT
 * This uses GAMBannerAd with MEDIUM_RECTANGLE size
 * which Google automatically renders as native-style content ads
 * with images, text, and call-to-action buttons
 */
const NativeAdComponent: React.FC<NativeAdProps> = ({
  adUnitId,
  style,
}) => {
  // Use correct test ID if no adUnitId provided
  const finalAdUnitId = adUnitId || (
    Platform.OS === 'ios' 
      ? NATIVE_AD_TEST_IDS.ios 
      : NATIVE_AD_TEST_IDS.android
  );
  const [isLoading, setIsLoading] = useState(true);
  const [adLoaded, setAdLoaded] = useState(false);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.adCard}>
        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.loadingText}>Loading ad...</Text>
          </View>
        )}

        {/* Native Style Ad using GAMBannerAd */}
        <GAMBannerAd
          unitId={finalAdUnitId}
          sizes={[BannerAdSize.MEDIUM_RECTANGLE]} // 300x250 - Best for native-style ads
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => {
            console.log('✅ Native Ad Loaded with ID:', finalAdUnitId);
            setIsLoading(false);
            setAdLoaded(true);
          }}
          onAdFailedToLoad={(error) => {
            console.log('❌ Native Ad Failed:', error);
            console.log('Ad Unit ID used:', finalAdUnitId);
            setIsLoading(false);
          }}
        />

        {/* Ad Label (Required by Google AdMob Policy) */}
        {adLoaded && (
          <View style={styles.adLabel}>
            <Text style={styles.adLabelText}>Ad</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    alignItems: 'center',
  },
  adCard: {
    width: 300,
    height: 250,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  adLabel: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  adLabelText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
});

export default NativeAdComponent;