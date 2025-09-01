import Purchases from 'react-native-purchases';
import { create } from 'zustand';

type EntState = { isPro: boolean; refresh: () => Promise<void>; purchase: () => Promise<void>; };

export const useEntitlement = create<EntState>((set) => ({
    isPro: false,
    refresh: async () => {
        const customerInfo = await Purchases.getCustomerInfo();
        set({ isPro: !!customerInfo.entitlements.active.pro });
    },
    purchase: async () => {
        const offerings = await Purchases.getOfferings();
        const pkg = offerings.current?.availablePackages[0];
        if (!pkg) return;
        const { customerInfo } = await Purchases.purchasePackage(pkg);
        set({ isPro: !!customerInfo.entitlements.active.pro });
    }
}));
