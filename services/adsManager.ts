import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  AdEventType,
  AppOpenAd,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';

interface AdConfig {
  android_app_open_id: string;
  ios_app_open_id: string;
  android_interstitial_id: string;
  ios_interstitial_id: string;
  android_banner_id: string;
  ios_banner_id: string;
  picker_ads: boolean;
  back_button_ads?: { show: boolean; frequency: number };
  splash_screen?: {
    show_ads: boolean;
    ad_type: string;
    frequency: number;
  };
  language_screen?: {
    show_banner: boolean;
    banner_position: string;
  };
  home_screen?: {
    show_banner: boolean;
    banner_position: string;
  };
  setting_screen?: {
    show_banner: boolean;
    banner_position: string;
  };
  giveaway_rules_screen?: {
    show_banner: boolean;
    banner_position: string;
  };
  interstitial_config?: {
    splash_to_language?: { show: boolean; frequency: number };
    language_to_home?: { show: boolean; frequency: number };
    setting_back_click?: { show: boolean; frequency: number };
  };
}

class AdsManager {
  private static instance: AdsManager;
  private config: AdConfig | null = null;
  private appOpenAd: AppOpenAd | null = null;
  private interstitialAd: InterstitialAd | null = null;
  private isShowingAd = false;

  // Ad frequency tracking keys
  private readonly APP_OPEN_SHOWN_KEY = 'app_open_ad_shown';
  private readonly INTERSTITIAL_COUNT_KEY = 'interstitial_ad_count';
  private readonly BACK_AD_LAST_SHOWN_KEY = 'back_ad_last_shown';
  private readonly SCREEN_VISIT_PREFIX = 'screen_visit_';

  private sessionAdsShown: Set<string> = new Set();

  private constructor() {}

  static getInstance(): AdsManager {
    if (!AdsManager.instance) {
      AdsManager.instance = new AdsManager();
    }
    return AdsManager.instance;
  }

  setConfig(config: AdConfig) {
    this.config = config;
    console.log('🎯 Ads Config Set:', config);
  }

  private getAdUnitId(type: 'app_open' | 'interstitial' | 'banner'): string {
    if (!this.config) return TestIds.BANNER;

    const idMap = {
      app_open: Platform.OS === 'ios'
        ? this.config.ios_app_open_id
        : this.config.android_app_open_id,
      interstitial: Platform.OS === 'ios'
        ? this.config.ios_interstitial_id
        : this.config.android_interstitial_id,
      banner: Platform.OS === 'ios'
        ? this.config.ios_banner_id
        : this.config.android_banner_id,
    };
    return idMap[type] || TestIds.BANNER;
  }

  isAdsEnabled(): boolean {
    return this.config?.picker_ads === true;
  }

  // ==================== APP OPEN AD ====================
  async loadAppOpenAd() {
    if (!this.isAdsEnabled()) return;

    const adUnitId = this.getAdUnitId('app_open');

    try {
      this.appOpenAd = AppOpenAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('✅ App Open Ad Loaded');
      });

      this.appOpenAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('App Open Ad Closed');
        this.isShowingAd = false;
        this.loadAppOpenAd();
      });

      this.appOpenAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('❌ App Open Ad Error:', error);
        this.isShowingAd = false;
      });

      this.appOpenAd.load();
    } catch (error) {
      console.log('App Open Ad Load Failed:', error);
    }
  }

  async showAppOpenAd(): Promise<boolean> {
    if (!this.isAdsEnabled() || this.isShowingAd) return false;

    const splashConfig = this.config?.splash_screen;
    if (!splashConfig?.show_ads) return false;

    const lastShown = await AsyncStorage.getItem(this.APP_OPEN_SHOWN_KEY);
    const frequency = splashConfig.frequency || 1;

    if (frequency === 1 && lastShown) {
      console.log('App Open Ad already shown (lifetime)');
      return false;
    }

    if (frequency === 2 && lastShown) {
      const lastDate = new Date(lastShown).toDateString();
      const today = new Date().toDateString();
      if (lastDate === today) {
        console.log('App Open Ad already shown today');
        return false;
      }
    }

    if (this.appOpenAd) {
      try {
        this.isShowingAd = true;
        await this.appOpenAd.show();
        await AsyncStorage.setItem(this.APP_OPEN_SHOWN_KEY, new Date().toISOString());
        console.log('✅ App Open Ad Shown');
        return true;
      } catch (error) {
        console.log('❌ App Open Ad Show Failed:', error);
        this.isShowingAd = false;
        return false;
      }
    }
    return false;
  }

  // ==================== INTERSTITIAL AD ====================
  async loadInterstitialAd() {
    if (!this.isAdsEnabled()) return;

    const adUnitId = this.getAdUnitId('interstitial');

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(adUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      this.interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        console.log('✅ Interstitial Ad Loaded');
      });

      this.interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        console.log('Interstitial Ad Closed');
        this.isShowingAd = false;
        this.loadInterstitialAd();
      });

      this.interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
        console.log('❌ Interstitial Ad Error:', error);
        this.isShowingAd = false;
      });

      this.interstitialAd.load();
    } catch (error) {
      console.log('Interstitial Ad Load Failed:', error);
    }
  }

  async showInterstitialAd(route?: string): Promise<boolean> {
    if (!this.isAdsEnabled() || this.isShowingAd) return false;

    const interstitialConfig = this.config?.interstitial_config;
    let shouldShow = true;

    if (route && interstitialConfig) {
      const routeConfig = interstitialConfig[route as keyof typeof interstitialConfig];
      if (routeConfig && !routeConfig.show) {
        return false;
      }
    }

    if (this.interstitialAd && shouldShow) {
      try {
        this.isShowingAd = true;
        await this.interstitialAd.show();

        const count = await AsyncStorage.getItem(this.INTERSTITIAL_COUNT_KEY);
        const newCount = (parseInt(count || '0') + 1).toString();
        await AsyncStorage.setItem(this.INTERSTITIAL_COUNT_KEY, newCount);

        console.log('✅ Interstitial Ad Shown');
        return true;
      } catch (error) {
        console.log('❌ Interstitial Ad Show Failed:', error);
        this.isShowingAd = false;
        return false;
      }
    }
    return false;
  }

  // ==================== BACK BUTTON AD ====================
  async trackScreenVisit(screenName: string) {
    const key = `${this.SCREEN_VISIT_PREFIX}${screenName}`;
    await AsyncStorage.setItem(key, new Date().toISOString());
    console.log(`📍 Tracked visit to: ${screenName}`);
  }

  private async isFirstVisit(screenName: string): Promise<boolean> {
    const key = `${this.SCREEN_VISIT_PREFIX}${screenName}`;
    const lastVisit = await AsyncStorage.getItem(key);
    return !lastVisit;
  }

  async showBackButtonAd(screenName: string): Promise<boolean> {
    if (!this.isAdsEnabled() || this.isShowingAd) {
      console.log('⏭️ Ads disabled or already showing');
      return false;
    }

    const backAdsConfig = this.config?.back_button_ads;

    if (!backAdsConfig?.show) {
      console.log('⏭️ Back button ads disabled in config');
      return false;
    }

    console.log('🎯 Back button ads config:', backAdsConfig);

    const frequency = backAdsConfig.frequency || 1;

    // Frequency 1: Show only on first visit
    if (frequency === 1) {
      const isFirst = await this.isFirstVisit(screenName);
      if (!isFirst) {
        console.log(`⏭️ Not first visit to ${screenName}, skipping ad`);
        return false;
      }
    }

    // Frequency 2: Show every time (no restrictions)

    // Frequency 3: Show once per day
    if (frequency === 3) {
      const lastShown = await AsyncStorage.getItem(this.BACK_AD_LAST_SHOWN_KEY);
      if (lastShown) {
        const lastDate = new Date(lastShown).toDateString();
        const today = new Date().toDateString();
        if (lastDate === today) {
          console.log('⏭️ Back button ad already shown today');
          return false;
        }
      }
    }

    // Frequency 4: Show once per session
    if (frequency === 4) {
      if (this.sessionAdsShown.has(screenName)) {
        console.log(`⏭️ Ad already shown for ${screenName} in this session`);
        return false;
      }
    }

    // Show the ad
    if (this.interstitialAd) {
      try {
        this.isShowingAd = true;
        await this.interstitialAd.show();

        await AsyncStorage.setItem(this.BACK_AD_LAST_SHOWN_KEY, new Date().toISOString());

        if (frequency === 1) {
          await this.trackScreenVisit(screenName);
        }

        if (frequency === 4) {
          this.sessionAdsShown.add(screenName);
        }

        console.log(`✅ Back button ad shown for ${screenName}`);
        return true;
      } catch (error) {
        console.log('❌ Back button ad show failed:', error);
        this.isShowingAd = false;
        return false;
      }
    }

    console.log('⚠️ No interstitial ad loaded');
    return false;
  }

  // ==================== BANNER AD CONFIG ====================
  getBannerConfig(screen: string): { show: boolean; id: string; position: string } | null {
    if (!this.isAdsEnabled()) return null;

    const screenConfig = this.config?.[`${screen}_screen` as keyof AdConfig];

    if (screenConfig && typeof screenConfig === 'object' && 'show_banner' in screenConfig) {
      const config = screenConfig as { show_banner?: boolean; banner_position?: string };
      if (config.show_banner) {
        return {
          show: true,
          id: this.getAdUnitId('banner'),
          position: config.banner_position || 'bottom',
        };
      }
    }
    return null;
  }

  // ==================== INITIALIZATION ====================
  initializeAds() {
    if (!this.isAdsEnabled()) {
      console.log('⚠️ Ads are disabled in config');
      return;
    }

    console.log('🚀 Initializing Ads...');
    this.loadAppOpenAd();
    this.loadInterstitialAd();
  }
}

export default AdsManager.getInstance();