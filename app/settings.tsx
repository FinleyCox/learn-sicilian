import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEntitlement } from '../store/useEntitlement';

const STORAGE_KEYS = {
    notifyOn: 'notifyOn',
    notifyHour: 'notifyHour',
    themeDark: 'themeDark',
};

// async function scheduleDaily(hour: number) {
//     const { status } = await Notifications.requestPermissionsAsync();
//     if (status !== 'granted') {
//         Alert.alert('通知が許可されていません', '端末の設定から通知を有効にしてください。');
//         return false;
//     }
//     await Notifications.cancelAllScheduledNotificationsAsync();
//         // await Notifications.scheduleNotificationAsync({
//         //     content: { title: 'シチリア語 今日の3語', body: '1分でサクッと学ぼう' },
//         //     trigger: { hour, minute: 0, repeats: true },
//         // });
//     return true;
// }

export default function Settings() {
    // const { restore } = useEntitlement(); // RevenueCat導入後に有効
    const [notifyOn, setNotifyOn] = useState(false);
    const [notifyHour, setNotifyHour] = useState(9);
    const [themeDark, setThemeDark] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
        const on = (await AsyncStorage.getItem(STORAGE_KEYS.notifyOn)) === '1';
        const hour = Number(await AsyncStorage.getItem(STORAGE_KEYS.notifyHour)) || 9;
        const dark = (await AsyncStorage.getItem(STORAGE_KEYS.themeDark)) === '1';
        setNotifyOn(on); setNotifyHour(hour); setThemeDark(dark);
        })();
    }, []);

    async function toggleNotify(on: boolean) {
        setNotifyOn(on);
        await AsyncStorage.setItem(STORAGE_KEYS.notifyOn, on ? '1' : '0');
        if (on) {
        // const ok = await scheduleDaily(notifyHour);
        // if (!ok) { setNotifyOn(false); await AsyncStorage.setItem(STORAGE_KEYS.notifyOn, '0'); }
        // } else {
        // await Notifications.cancelAllScheduledNotificationsAsync();
        // }
    }

    async function changeHour(delta: number) {
        const next = (notifyHour + delta + 24) % 24;
        setNotifyHour(next);
        await AsyncStorage.setItem(STORAGE_KEYS.notifyHour, String(next));
        // if (notifyOn) await scheduleDaily(next);
    }

    async function onRestore() {
        setBusy(true);
        try {
        // RevenueCat未設定でも落ちないように
        // await restore?.();
        Alert.alert('購入の復元', '購入履歴の復元を試行しました。');
        } catch {
        Alert.alert('購入の復元', '現在は開発中のため復元はダミーです。');
        } finally {
        setBusy(false);
        }
    }

    async function toggleTheme(on: boolean) {
        setThemeDark(on);
        await AsyncStorage.setItem(STORAGE_KEYS.themeDark, on ? '1' : '0');
    }

    return (
        <SafeAreaView style={styles.container}>
        <Text style={styles.title}>設定</Text>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>通知</Text>
            <View style={styles.row}>
            <Text style={styles.label}>毎日の学習リマインド</Text>
            {/* <Switch value={notifyOn} onValueChange={toggleNotify} /> */}
            </View>
            <View style={styles.row}>
            <Text style={styles.label}>通知時刻</Text>
            <View style={styles.hourBox}>
                <Pressable style={styles.hourBtn} onPress={() => changeHour(-1)}><Text style={styles.hourBtnText}>-</Text></Pressable>
                <Text style={styles.hourText}>{notifyHour}:00</Text>
                <Pressable style={styles.hourBtn} onPress={() => changeHour(+1)}><Text style={styles.hourBtnText}>+</Text></Pressable>
            </View>
            </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>購入</Text>
            <Pressable style={[styles.button, busy && { opacity: 0.7 }]} onPress={onRestore} disabled={busy}>
            <Text style={styles.buttonText}>購入の復元</Text>
            </Pressable>
            <Text style={styles.note}>※ Google Play のライセンステスターで配布したビルドで動作します。</Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>表示</Text>
            <View className="flex-row" style={styles.row}>
            <Text style={styles.label}>ダークテーマ</Text>
            <Switch value={themeDark} onValueChange={toggleTheme} />
            </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>ドキュメント</Text>
            <Text style={styles.link}>プライバシーポリシー（近日公開）</Text>
            <Text style={styles.link}>利用規約（近日公開）</Text>
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, gap: 16, backgroundColor: '#f5f5f5' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 8 },
    section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { fontSize: 14, color: '#333' },
    hourBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hourText: { fontSize: 16, fontWeight: '700' },
    hourBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
    hourBtnText: { fontSize: 18, fontWeight: '800' },
    button: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    buttonText: { color: '#fff', fontWeight: '800' },
    note: { fontSize: 12, color: '#666' },
    link: { color: '#3366cc', textDecorationLine: 'underline' },
})};
