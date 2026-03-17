// AsyncStorage wrapper (instead of localStorage)
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_STORAGE_KEY = 'ssms_mobile_auth';

export async function getItem(key) {
	try {
		const raw = await AsyncStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch (error) {
		console.error('[storage] getItem failed:', error);
		return null;
	}
}

export async function setItem(key, value) {
	try {
		await AsyncStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error('[storage] setItem failed:', error);
	}
}

export async function removeItem(key) {
	try {
		await AsyncStorage.removeItem(key);
	} catch (error) {
		console.error('[storage] removeItem failed:', error);
	}
}
