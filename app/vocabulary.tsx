import { useEffect, useMemo, useState, useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, Alert, LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, initDb } from '../lib/db';
import { useEntitlement } from '../store/useEntitlement';
import Checkbox from 'expo-checkbox';

type Row = {
  id: number | string;
  word: string;
  meaning_ja: string;
  is_premium: number;
  learned: 0 | 1;
};

export default function Vocabulary() {
  const insets = useSafeAreaInsets();
  const { isPro, refresh, purchase } = useEntitlement();
  const [items, setItems] = useState<Row[]>([]);
  const [learnedCount, setLearnedCount] = useState(0);
  const [ctaHeight, setCtaHeight] = useState(0);

  // 共通のSELECT（無料/有料でWHEREだけ変える）
  const fetchItems = useCallback(async (pro: boolean) => {
    const base = `
      SELECT c.id, c.word, c.meaning_ja, c.is_premium,
      COALESCE(p.learned, 0) AS learned
      FROM cards c
      LEFT JOIN progress p ON p.card_id = c.id
    `;
    const rows = await db.getAllAsync<Row>(
      pro ? `${base} ORDER BY c.word ASC`
          : `${base} WHERE c.is_premium=0 ORDER BY c.word ASC`
    );
    setItems(rows);

    const cnt = await db.getFirstAsync<{ c: number }>(
      pro
        ? 'SELECT COUNT(1) as c FROM progress WHERE learned=1'
        : `SELECT COUNT(1) as c
           FROM progress p JOIN cards c ON p.card_id=c.id
           WHERE p.learned=1 AND c.is_premium=0`
    );
    setLearnedCount(cnt?.c ?? 0);
  }, []);

  useEffect(() => {
    (async () => {
      await initDb();
      try { await refresh(); } catch {}
      await fetchItems(isPro);
    })();
  }, [isPro, fetchItems, refresh]);

  const total = useMemo(() => (isPro ? 100 : 30), [isPro]);

  function onLockedPress() {
    Alert.alert('Proで70語をアンロック', '追加の単語が使えます', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '購入する', onPress: () => purchase().catch(() => {}) }
    ]);
  }

  // チェックのトグル（楽観更新+UPSERT）
  const toggleLearned = useCallback(async (cardId: number | string, next: boolean) => {
    // 1) 楽観更新
    setItems(prev => prev.map(r => r.id === cardId ? { ...r, learned: next ? 1 : 0 } : r));
    setLearnedCount(prev => prev + (next ? 1 : -1));

    // 2) DB反映（失敗したらロールバック）
    try {
      await db.runAsync(
        `INSERT INTO progress(card_id, learned)
        VALUES(?, ?)
        ON CONFLICT(card_id) DO UPDATE SET learned=excluded.learned`,
        [cardId, next ? 1 : 0]
      );
    } catch (e) {
      // ロールバック
      setItems(prev => prev.map(r => r.id === cardId ? { ...r, learned: next ? 0 : 1 } : r));
      setLearnedCount(prev => prev + (next ? -1 : 1));
      console.log('toggleLearned failed:', e);
    }
  }, []);

  // CTA計測
  const onCtaLayout = (e: LayoutChangeEvent) => setCtaHeight(e.nativeEvent.layout.height);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>単語学習</Text>
        <Text style={styles.subtitle}>シチリア語の単語を学びましょう</Text>
        <View style={styles.pill}>
          <Text style={styles.pillText}>進捗 {learnedCount}/{total}</Text>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ paddingVertical: 12, gap: 8 }}
        scrollIndicatorInsets={{ bottom: (!isPro ? ctaHeight + insets.bottom + 16 : 0) }}
        ListFooterComponent={!isPro ? () => <View style={{ height: ctaHeight + insets.bottom + 16 }} /> : null}
        renderItem={({ item }) => {
          const locked = item.is_premium === 1 && !isPro;
          return (
            <Pressable
              onPress={locked ? onLockedPress : undefined}
              disabled={!locked ? false : false}
              style={[styles.row, locked && styles.rowLocked]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.word}>{locked ? '🔒 ' : ''}{item.word}</Text>
                <Text style={styles.meaning}>{item.meaning_ja}</Text>
              </View>

              {/* 学習チェック：ロック中は無効化 */}
              <Checkbox
                value={!!item.learned}
                onValueChange={(v) => !locked && toggleLearned(item.id, v)}
                disabled={locked}
              />
            </Pressable>
          );
        }}
      />

      {!isPro && (
        <View
          onLayout={onCtaLayout}
          style={[styles.cta, { bottom: insets.bottom + 12, paddingBottom: 12 }]}
        >
          <Text style={styles.ctaText}>Proで70語アンロック</Text>
          <Pressable onPress={onLockedPress} style={styles.ctaButton}>
            <Text style={styles.ctaButtonText}>購入する</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#f5f5f5' },
  header: { marginTop: 8, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4, marginBottom: 16 },
  pill: { alignSelf: 'flex-start', backgroundColor: '#eee', borderRadius: 9999, paddingVertical: 6, paddingHorizontal: 12, marginBottom: 8 },
  pillText: { color: '#333', fontWeight: '600' },
  row: { width: '100%', backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  rowLocked: { opacity: 0.5 },
  word: { fontSize: 18, fontWeight: '600', color: '#111' },
  meaning: { fontSize: 14, color: '#666', marginTop: 2 },
  cta: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#111',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  ctaButton: { backgroundColor: '#ffd54f', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14 },
  ctaButtonText: { color: '#111', fontWeight: '800' }
});
