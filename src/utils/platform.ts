import { Capacitor } from '@capacitor/core';

export const isCapacitor = Capacitor.isNativePlatform();
export const isElectron = !!(window as any).electronUpdater || !!(window as any).electronPin;
export const isMobile = isCapacitor;

const platform = { isCapacitor, isElectron, isMobile };
export default platform;
