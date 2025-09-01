import { useEffect, useMemo, useState, useCallback } from 'react';
import { Text, View, StyleSheet, FlatList, Pressable, Alert, LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, initDb } from '../lib/db';
import { useEntitlement } from '../store/useEntitlement';
import Checkbox from 'expo-checkbox';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>単語学習</Text>
            <Text style={styles.subtitle}>シチリア語の単語を学びましょう</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressPill}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.progressText}>進捗 {learnedCount}/{total}</Text>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${(learnedCount / total) * 100}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={{ paddingVertical: 12, gap: 8, paddingHorizontal: 0 }}
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
              <View style={styles.rowContent}>
                <View style={styles.wordContainer}>
                  {locked && (
                    <View style={styles.lockIcon}>
                      <Ionicons name="lock-closed" size={16} color="#f59e0b" />
                    </View>
                  )}
                  <Text style={[styles.word, locked && styles.wordLocked]}>
                    {item.word}
                  </Text>
                </View>
                <Text style={[styles.meaning, locked && styles.meaningLocked]}>
                  {item.meaning_ja}
                </Text>
              </View>

              {/* 学習チェック：ロック中は無効化 */}
              <View style={styles.checkboxContainer}>
                <Checkbox
                  value={!!item.learned}
                  onValueChange={(v) => !locked && toggleLearned(item.id, v)}
                  disabled={locked}
                  style={styles.checkbox}
                />
              </View>
            </Pressable>
          );
        }}
      />

      {!isPro && (
        <View
          onLayout={onCtaLayout}
          style={[styles.cta, { bottom: insets.bottom + 12, paddingBottom: 12 }]}
        >
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.ctaGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.ctaContent}>
              <View style={styles.ctaTextContainer}>
                <Text style={styles.ctaText}>Proで70語アンロック</Text>
                <Text style={styles.ctaSubtext}>追加の単語で学習を加速</Text>
              </View>
              <Pressable onPress={onLockedPress} style={styles.ctaButton}>
                <Text style={styles.ctaButtonText}>購入する</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#667eea' 
  },
  headerGradient: {
    paddingBottom: 24,
  },
  header: { 
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerContent: {
    marginBottom: 20,
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
  progressContainer: {
    gap: 12,
  },
  progressPill: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)', 
    borderRadius: 20, 
    paddingVertical: 8, 
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    gap: 8,
  },
  progressText: { 
    color: 'white', 
    fontWeight: '600',
    fontSize: 14,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },
  row: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 12, 
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginHorizontal: 16,
  },
  rowLocked: { 
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 4,
  },
  word: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f2937',
    lineHeight: 24,
  },
  wordLocked: {
    color: '#9ca3af',
  },
  meaning: { 
    fontSize: 15, 
    color: '#6b7280', 
    lineHeight: 20,
  },
  meaningLocked: {
    color: '#d1d5db',
  },
  checkboxContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
  },
  cta: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 20,
    zIndex: 10,
  },
  ctaGradient: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTextContainer: {
    flex: 1,
  },
  ctaText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
  },
  ctaSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  ctaButton: { 
    backgroundColor: 'white', 
    borderRadius: 16, 
    paddingVertical: 12, 
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  ctaButtonText: { 
    color: '#1f2937',
    fontSize: 14,
  }
});
