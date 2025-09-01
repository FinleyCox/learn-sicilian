import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, initDb } from '../lib/db';
import { useEntitlement } from '../store/useEntitlement';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type CardRow = { id: number; word: string; meaning_ja: string; is_premium: number };

type Question = {
  id: number;
  word: string;
  correct: string;
  choices: string[];       // shuffled
  correctIndex: number;
};

type Stage = 'config' | 'playing' | 'result';

const COUNTS = [5, 10, 15] as const;

export default function Quiz() {
  const { isPro, refresh } = useEntitlement();
  const [stage, setStage] = useState<Stage>('config');
  const [count, setCount] = useState<typeof COUNTS[number]>(5);
  const [pool, setPool] = useState<CardRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cursor, setCursor] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]); // 選んだindex
  const [score, setScore] = useState(0);

  // 出題元：無料→is_premium=0、課金済み→is_premium=1
  const sourcePremiumFlag = useMemo(() => (isPro ? 1 : 0), [isPro]);

  useEffect(() => {
    (async () => {
      await initDb();
      try { await refresh(); } catch {}
      // プールを取得（十分な件数があるかは後でチェック）
      const rows = await db.getAllAsync<CardRow>(
        'SELECT id, word, meaning_ja, is_premium FROM cards WHERE is_premium=?',
        [sourcePremiumFlag]
      );
      setPool(rows);
    })();
  }, [sourcePremiumFlag, refresh]);

  // クイズを組み立て
  const makeQuiz = useCallback(() => {
    if (pool.length < Math.min(count, 2)) {
      Alert.alert('問題を作成できません', `このカテゴリの単語が足りません（現在 ${pool.length} 件）。`);
      return;
    }
    // シャッフル＆先頭からcount件を問題化
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(count, shuffled.length));

    // 誤選択肢候補（意味）を用意
    const allMeanings = [...new Set(pool.map(p => p.meaning_ja))];

    const qs: Question[] = picked.map((row) => {
      const correct = row.meaning_ja;
      // ダミー選択肢：正解以外から3つサンプル
      const distractPool = allMeanings.filter(m => m !== correct);
      const distracts = sampleN(distractPool, Math.min(3, Math.max(0, allMeanings.length - 1)));
      const choices = shuffle([correct, ...distracts]);
      const correctIndex = choices.indexOf(correct);
      return { id: row.id, word: row.word, correct, choices, correctIndex };
    });

    setQuestions(qs);
    setCursor(0);
    setAnswers([]);
    setScore(0);
    setStage('playing');
  }, [pool, count]);

  // 回答処理
  const answer = (choiceIndex: number) => {
    if (stage !== 'playing') return;
    const q = questions[cursor];
    const ok = choiceIndex === q.correctIndex;
    setAnswers(prev => [...prev, choiceIndex]);
    if (ok) setScore(prev => prev + 1);

    // 次へ
    const next = cursor + 1;
    if (next >= questions.length) {
      setStage('result');
    } else {
      setCursor(next);
    }
  };

  const retry = () => setStage('config');

  // UI
  if (stage === 'config') {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#f093fb', '#f5576c']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>クイズ設定</Text>
            <Text style={styles.subtitle}>知識をテストして学習を深めよう</Text>
          </View>
        </LinearGradient>
        
        <View style={styles.card}>
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons name="library-outline" size={20} color="#667eea" />
              <Text style={styles.infoText}>
                出題元単語数：{isPro ? '100語' : '30語'}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
              <Text style={styles.infoText}>所持単語：{pool.length} 語</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>出題数を選択</Text>
            <View style={styles.countRow}>
              {COUNTS.map(n => (
                <Pressable
                  key={n}
                  onPress={() => setCount(n)}
                  style={[styles.countBtn, count === n && styles.countBtnActive]}
                >
                  <Text style={[styles.countBtnText, count === n && styles.countBtnTextActive]}>
                    {n} 問
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable 
            onPress={makeQuiz} 
            style={[styles.startBtn, pool.length < 2 && { opacity: 0.6 }]} 
            disabled={pool.length < 2}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              style={styles.startBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="play" size={20} color="white" />
              <Text style={styles.startBtnText}>クイズ開始</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'playing') {
    const q = questions[cursor];
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>クイズ</Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressItem}>
                <Ionicons name="list" size={16} color="white" />
                <Text style={styles.progressText}>{cursor + 1} / {questions.length}</Text>
              </View>
              <View style={styles.progressItem}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.progressText}>正解 {score}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.quizCard}>
          <View style={styles.questionContainer}>
            <Text style={styles.word}>{q.word}</Text>
            <Text style={styles.help}>意味（日本語）を選んでください</Text>
          </View>

          <FlatList
            data={q.choices}
            keyExtractor={(c, idx) => `${q.id}-${idx}`}
            contentContainerStyle={styles.choicesContainer}
            renderItem={({ item, index }) => (
              <Pressable
                style={styles.choice}
                onPress={() => answer(index)}
              >
                <View style={styles.choiceContent}>
                  <View style={styles.choiceNumber}>
                    <Text style={styles.choiceNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.choiceText}>{item}</Text>
                </View>
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    );
  }

  // result
  const rows = questions.map((q, i) => {
    const chosen = answers[i];
    const correct = q.correctIndex;
    const ok = chosen === correct;
    return { q, chosen, ok };
  });

  const percentage = Math.round((score / questions.length) * 100);
  const getScoreColor = () => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>結果</Text>
          <Text style={styles.subtitle}>お疲れさまでした！</Text>
        </View>
      </LinearGradient>
      
      <View style={styles.resultCard}>
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: getScoreColor() }]}>
            {score} / {questions.length}
          </Text>
          <Text style={styles.percentage}>{percentage}%</Text>
          <Text style={styles.resultMessage}>
            {percentage >= 80 ? '素晴らしい！' : percentage >= 60 ? 'よくできました！' : 'もう少し練習しましょう'}
          </Text>
        </View>
        
        <Pressable onPress={retry} style={styles.retryBtn}>
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.retryBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryBtnText}>もう一度挑戦</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.q.id)}
        contentContainerStyle={styles.resultsList}
        renderItem={({ item }) => (
          <View style={[styles.rowItem, item.ok ? styles.rowOK : styles.rowNG]}>
            <View style={styles.rowHeader}>
              <Text style={styles.rowWord}>{item.q.word}</Text>
              <Ionicons 
                name={item.ok ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={item.ok ? "#10b981" : "#ef4444"} 
              />
            </View>
            <Text style={styles.rowDetail}>正解：{item.q.choices[item.q.correctIndex]}</Text>
            {!item.ok && (
              <Text style={[styles.rowDetail, styles.wrongAnswer]}>
                あなたの回答：{item.q.choices[item.chosen]}
              </Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

/** helpers */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function sampleN<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (arr.length <= n) return shuffle(arr);
  const a = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = (Math.random() * a.length) | 0;
    out.push(a[idx]);
    a.splice(idx, 1);
  }
  return out;
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

  card: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginTop: 8,
    padding: 20, 
    borderRadius: 20, 
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  infoSection: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  countRow: { 
    flexDirection: 'row', 
    gap: 12, 
    flexWrap: 'wrap' 
  },
  countBtn: { 
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 16, 
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  countBtnActive: { 
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  countBtnText: { 
    color: '#374151', 
    fontWeight: '600',
    fontSize: 15,
  },
  countBtnTextActive: { 
    color: 'white' 
  },

  startBtn: { 
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  startBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: { 
    color: 'white', 
    fontWeight: '700',
    fontSize: 16,
  },

  progressContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: { 
    color: 'white', 
    fontWeight: '600',
    fontSize: 14,
  },

  quizCard: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginTop: 8,
    padding: 20, 
    borderRadius: 20, 
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  questionContainer: {
    alignItems: 'center',
    gap: 8,
  },
  word: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#1f2937',
    textAlign: 'center',
  },
  help: { 
    color: '#6b7280',
    fontSize: 16,
    textAlign: 'center',
  },
  choicesContainer: {
    gap: 12,
  },
  choice: { 
    backgroundColor: '#f8fafc', 
    borderRadius: 16, 
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
  },
  choiceNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  choiceText: { 
    color: '#1f2937', 
    fontWeight: '600',
    fontSize: 16,
    flex: 1,
  },

  resultCard: { 
    backgroundColor: '#fff', 
    marginHorizontal: 16, 
    marginTop: 8,
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center', 
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  scoreContainer: {
    alignItems: 'center',
    gap: 8,
  },
  score: { 
    fontSize: 48, 
    fontWeight: '900',
  },
  percentage: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6b7280',
  },
  resultMessage: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  retryBtnGradient: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },

  resultsList: {
    padding: 16,
    gap: 12,
  },
  rowItem: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rowOK: { 
    borderLeftWidth: 4, 
    borderLeftColor: '#10b981' 
  },
  rowNG: { 
    borderLeftWidth: 4, 
    borderLeftColor: '#ef4444' 
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowWord: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#1f2937',
    flex: 1,
  },
  rowDetail: { 
    color: '#6b7280', 
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
  },
  wrongAnswer: {
    color: '#ef4444',
    fontWeight: '500',
  }
});
