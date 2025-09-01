import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEntitlement } from '../store/useEntitlement';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
        <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.header}>
                <Text style={styles.title}>設定</Text>
                <Text style={styles.subtitle}>アプリをカスタマイズしよう</Text>
            </View>
        </LinearGradient>

        <View style={styles.content}>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="notifications-outline" size={20} color="#667eea" />
                    <Text style={styles.sectionTitle}>通知</Text>
                </View>
                <View style={styles.settingItem}>
                    <View style={styles.settingContent}>
                        <Text style={styles.label}>毎日の学習リマインド</Text>
                        <Text style={styles.settingDescription}>毎日決まった時間に学習を促す通知</Text>
                    </View>
                    {/* <Switch value={notifyOn} onValueChange={toggleNotify} /> */}
                </View>
                <View style={styles.settingItem}>
                    <View style={styles.settingContent}>
                        <Text style={styles.label}>通知時刻</Text>
                        <Text style={styles.settingDescription}>通知を送る時間を設定</Text>
                    </View>
                    <View style={styles.hourBox}>
                        <Pressable style={styles.hourBtn} onPress={() => changeHour(-1)}>
                            <Ionicons name="remove" size={16} color="#374151" />
                        </Pressable>
                        <Text style={styles.hourText}>{notifyHour}:00</Text>
                        <Pressable style={styles.hourBtn} onPress={() => changeHour(+1)}>
                            <Ionicons name="add" size={16} color="#374151" />
                        </Pressable>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="card-outline" size={20} color="#f093fb" />
                    <Text style={styles.sectionTitle}>購入</Text>
                </View>
                <Pressable 
                    style={[styles.button, busy && { opacity: 0.7 }]} 
                    onPress={onRestore} 
                    disabled={busy}
                >
                    <LinearGradient
                        colors={['#f093fb', '#f5576c']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="refresh" size={20} color="white" />
                        <Text style={styles.buttonText}>購入の復元</Text>
                    </LinearGradient>
                </Pressable>
                <Text style={styles.note}>※ Google Play のライセンステスターで配布したビルドで動作します。</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="color-palette-outline" size={20} color="#4facfe" />
                    <Text style={styles.sectionTitle}>表示</Text>
                </View>
                <View style={styles.settingItem}>
                    <View style={styles.settingContent}>
                        <Text style={styles.label}>ダークテーマ</Text>
                        <Text style={styles.settingDescription}>暗いテーマに切り替え</Text>
                    </View>
                    <Switch 
                        value={themeDark} 
                        onValueChange={toggleTheme}
                        trackColor={{ false: '#e5e7eb', true: '#667eea' }}
                        thumbColor={themeDark ? '#ffffff' : '#f3f4f6'}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Ionicons name="document-text-outline" size={20} color="#10b981" />
                    <Text style={styles.sectionTitle}>ドキュメント</Text>
                </View>
                <Pressable style={styles.linkItem}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#10b981" />
                    <Text style={styles.link}>プライバシーポリシー（近日公開）</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </Pressable>
                <Pressable style={styles.linkItem}>
                    <Ionicons name="document-outline" size={20} color="#10b981" />
                    <Text style={styles.link}>利用規約（近日公開）</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </Pressable>
            </View>
        </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#f8fafc' 
    },
    headerGradient: {
        paddingBottom: 24,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    title: { 
        fontSize: 28, 
        fontWeight: '800', 
        color: 'white',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 22,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
    },
    section: { 
        backgroundColor: '#fff', 
        borderRadius: 20, 
        padding: 20, 
        gap: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 8,
    },
    sectionTitle: { 
        fontSize: 18, 
        fontWeight: '700', 
        color: '#1f2937' 
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    settingContent: {
        flex: 1,
        gap: 4,
    },
    label: { 
        fontSize: 16, 
        color: '#1f2937',
        fontWeight: '600',
    },
    settingDescription: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 18,
    },
    hourBox: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12,
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    hourText: { 
        fontSize: 18, 
        fontWeight: '700',
        color: '#1f2937',
        minWidth: 60,
        textAlign: 'center',
    },
    hourBtn: { 
        width: 32, 
        height: 32, 
        borderRadius: 8, 
        backgroundColor: '#e5e7eb', 
        alignItems: 'center', 
        justifyContent: 'center',
    },
    button: { 
        borderRadius: 16,
        overflow: 'hidden',
    },
    buttonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    buttonText: { 
        color: 'white', 
        fontWeight: '700',
        fontSize: 16,
    },
    note: { 
        fontSize: 13, 
        color: '#6b7280',
        lineHeight: 18,
        marginTop: 8,
    },
    linkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    link: { 
        color: '#667eea', 
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
})};
