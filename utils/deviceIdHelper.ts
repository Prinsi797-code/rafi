import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Storage Keys
const KEYCHAIN_DEVICE_ID = 'app_unique_device_id';
const ASYNC_STORAGE_KEY = '@app_device_id';

/**
 * iOS के लिए Keychain-based persistent device ID
 */
async function getIosDeviceId(): Promise<string> {
  try {
    let deviceId = await SecureStore.getItemAsync(KEYCHAIN_DEVICE_ID);
    
    if (deviceId) {
      console.log('iOS: Keychain से device ID मिला:', deviceId);
      return deviceId;
    }

    console.log('iOS: Keychain में ID नहीं मिला, नया बना रहे हैं...');

    const legacyId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (legacyId) {
      console.log('iOS: Legacy AsyncStorage से ID मिला:', legacyId);
      await SecureStore.setItemAsync(KEYCHAIN_DEVICE_ID, legacyId);
      console.log('iOS: ID को Keychain में migrate किया');
      return legacyId;
    }
    const iosId = await Application.getIosIdForVendorAsync();
    
    if (iosId) {
      console.log('iOS: Native ID मिला:', iosId);
      await SecureStore.setItemAsync(KEYCHAIN_DEVICE_ID, iosId);
      console.log('iOS: ID को Keychain में save किया');
      return iosId;
    }
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const generatedId = `ios_${timestamp}_${random}`;
    
    console.log('iOS: Generated new unique ID:', generatedId);
    
    await SecureStore.setItemAsync(KEYCHAIN_DEVICE_ID, generatedId);
    console.log('iOS: Generated ID को Keychain में save किया');
    
    return generatedId;

  } catch (error) {
    console.error('iOS device ID error:', error);
  
    try {
      const fallbackId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (fallbackId) {
        console.log('iOS: Fallback से ID मिला:', fallbackId);
        return fallbackId;
      }
    } catch (e) {
      console.error('iOS: Fallback भी fail हो गया:', e);
    }

    const tempId = `ios_temp_${Date.now()}`;
    console.warn('iOS: Using temporary ID:', tempId);
    return tempId;
  }
}

/**
 * Android के लिए AsyncStorage-based device ID
 */
async function getAndroidDeviceId(): Promise<string> {
  try {
    const savedId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (savedId) {
      console.log('Android: Saved ID मिला:', savedId);
      return savedId;
    }
    console.log('Android: Saved ID नहीं मिला, नया बना रहे हैं...');
    const androidId = await Application.getAndroidId();
    if (androidId) {
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, androidId);
      console.log('Android: Native ID saved:', androidId);
      return androidId;
    }
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const fallbackId = `android_${timestamp}_${random}`;
    
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, fallbackId);
    console.log('Android: Fallback ID saved:', fallbackId);
    return fallbackId;

  } catch (error) {
    console.error('Android device ID error:', error);
    const tempId = `android_temp_${Date.now()}`;
    console.warn('Android: Using temporary ID:', tempId);
    return tempId;
  }
}

async function getWebDeviceId(): Promise<string> {
  try {
    const savedId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (savedId) {
      console.log('Web: Saved ID मिला:', savedId);
      return savedId;
    }
    console.log('Web: Saved ID नहीं मिला, नया बना रहे हैं...');
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const webId = `web_${timestamp}_${random}`;
    
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, webId);
    console.log('Web: ID saved:', webId);
    return webId;

  } catch (error) {
    console.error('Web device ID error:', error);
    const tempId = `web_temp_${Date.now()}`;
    console.warn('Web: Using temporary ID:', tempId);
    return tempId;
  }
}

export async function getDeviceIdSafe(): Promise<string> {
  try {
    console.log(`Getting device ID for platform: ${Platform.OS}`);

    if (Platform.OS === 'ios') {
      return await getIosDeviceId();
    }
    if (Platform.OS === 'android') {
      return await getAndroidDeviceId();
    }
    if (Platform.OS === 'web') {
      return await getWebDeviceId();
    }
    const savedId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (savedId) {
      console.log(`${Platform.OS}: Saved ID मिला:`, savedId);
      return savedId;
    }

    const newId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await AsyncStorage.setItem(ASYNC_STORAGE_KEY, newId);
    console.log(`${Platform.OS}: New ID saved:`, newId);
    return newId;

  } catch (error) {
    console.error('Critical error in getDeviceIdSafe:', error);
    try {
      const savedId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      if (savedId) {
        console.log('Error recovery: Using saved ID:', savedId);
        return savedId;
      }
    } catch (e) {
      console.error('Fallback भी fail:', e);
    }
    const fallbackId = `fallback_${Platform.OS}_${Date.now()}`;
    console.warn('Using ultimate fallback ID:', fallbackId);
    return fallbackId;
  }
}
/**
 * Current device ID
 */
export async function getCurrentDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'ios') {
      const id = await SecureStore.getItemAsync(KEYCHAIN_DEVICE_ID);
      console.log('📱 iOS Current ID:', id);
      return id;
    } else if (Platform.OS === 'android') {
      const id = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
      console.log('📱 Android Current ID:', id);
      return id;
    }
    return null;
  } catch (error) {
    console.error('Failed to get current device ID:', error);
    return null;
  }
}

/**
 * Device ID को force reset
 */
export async function resetDeviceId(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await SecureStore.deleteItemAsync(KEYCHAIN_DEVICE_ID);
      console.log('iOS Keychain ID deleted');
    }
    
    await AsyncStorage.removeItem(ASYNC_STORAGE_KEY);
    console.log('AsyncStorage ID deleted');
    console.log('Device ID reset successfully');
    
  } catch (error) {
    console.error('Failed to reset device ID:', error);
    throw error;
  }
}

/**
 * Device ID की detailed info देखें (Debugging के लिए)
 */
export async function getDeviceIdInfo(): Promise<{
  currentId: string | null;
  platform: string;
  hasKeychainId: boolean;
  hasAsyncStorageId: boolean;
  nativeId: string | null;
}> {
  try {
    const currentId = await getCurrentDeviceId();
    
    let hasKeychainId = false;
    let hasAsyncStorageId = false;
    let nativeId: string | null = null;

    if (Platform.OS === 'ios') {
      const keychainId = await SecureStore.getItemAsync(KEYCHAIN_DEVICE_ID);
      hasKeychainId = !!keychainId;
      nativeId = await Application.getIosIdForVendorAsync();
    }

    const asyncId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    hasAsyncStorageId = !!asyncId;
    if (Platform.OS === 'android') {
      nativeId = await Application.getAndroidId();
    }

    return {
      currentId,
      platform: Platform.OS,
      hasKeychainId,
      hasAsyncStorageId,
      nativeId
    };
  } catch (error) {
    console.error('Failed to get device ID info:', error);
    return {
      currentId: null,
      platform: Platform.OS,
      hasKeychainId: false,
      hasAsyncStorageId: false,
      nativeId: null
    };
  }
}
/**
 * Legacy AsyncStorage data को Keychain में migrate करें
 */
export async function migrateToKeychain(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    console.log('Migration केवल iOS के लिए है');
    return false;
  }

  try {
    const keychainId = await SecureStore.getItemAsync(KEYCHAIN_DEVICE_ID);
    if (keychainId) {
      console.log('Already migrated to Keychain');
      return true;
    }

    const asyncId = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
    if (asyncId) {
      await SecureStore.setItemAsync(KEYCHAIN_DEVICE_ID, asyncId);
      console.log('Migrated to Keychain:', asyncId);
      return true;
    }
    
    console.log('No legacy ID found to migrate');
    return false;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

export default {
  getDeviceIdSafe,
  getCurrentDeviceId,
  resetDeviceId,
  getDeviceIdInfo,
  migrateToKeychain
};