import { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db, initDb } from '../lib/db';
import { useEntitlement } from '../store/useEntitlement';

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
        <Text style={styles.title}>クイズ設定</Text>
        <View style={styles.card}>
          <Text style={styles.label}>
            出題元単語数：{isPro ? '100語' : '30語'}
          </Text>
          <Text style={styles.subtle}>所持単語：{pool.length} 語</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>出題数を選択</Text>
          <View style={styles.row}>
            {COUNTS.map(n => (
              <Pressable
                key={n}
                onPress={() => setCount(n)}
                style={[styles.countBtn, count === n && styles.countBtnActive]}
              >
                <Text style={[styles.countBtnText, count === n && styles.countBtnTextActive]}>{n} 問</Text>
              </Pressable>
            ))}
          </View>

          <Pressable onPress={makeQuiz} style={[styles.startBtn, pool.length < 2 && { opacity: 0.6 }]} disabled={pool.length < 2}>
            <Text style={styles.startBtnText}>開始</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'playing') {
    const q = questions[cursor];
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>クイズ</Text>
        <View style={styles.progress}>
          <Text style={styles.progressText}>{cursor + 1} / {questions.length}</Text>
          <Text style={styles.progressText}>正解 {score}</Text>
        </View>

        <View style={styles.quizCard}>
          <Text style={styles.word}>{q.word}</Text>
          <Text style={styles.help}>意味（日本語）を選んでください</Text>

          <FlatList
            data={q.choices}
            keyExtractor={(c, idx) => `${q.id}-${idx}`}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item, index }) => (
              <Pressable
                style={styles.choice}
                onPress={() => answer(index)}
              >
                <Text style={styles.choiceText}>{item}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>結果</Text>
      <View style={styles.resultCard}>
        <Text style={styles.score}>{score} / {questions.length}</Text>
        <Text style={styles.subtle}>お疲れさま！もう一度挑戦する？</Text>
        <Pressable onPress={retry} style={styles.startBtn}>
          <Text style={styles.startBtnText}>もう一度</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(r) => String(r.q.id)}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        renderItem={({ item }) => (
          <View style={[styles.rowItem, item.ok ? styles.rowOK : styles.rowNG]}>
            <Text style={styles.rowWord}>{item.q.word}</Text>
            <Text style={styles.rowDetail}>正解：{item.q.choices[item.q.correctIndex]}</Text>
            {!item.ok && <Text style={styles.rowDetail}>あなたの回答：{item.q.choices[item.chosen]}</Text>}
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
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: '700', color: '#222', paddingHorizontal: 16, paddingTop: 12, marginBottom: 8 },

  card: { backgroundColor: '#fff', marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 12 },
  label: { fontSize: 14, fontWeight: '700', color: '#222' },
  subtle: { color: '#666', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },

  countBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#eee' },
  countBtnActive: { backgroundColor: '#111' },
  countBtnText: { color: '#111', fontWeight: '700' },
  countBtnTextActive: { color: '#fff' },

  startBtn: { backgroundColor: '#111', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  startBtnText: { color: '#fff', fontWeight: '800' },

  progress: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 8 },
  progressText: { color: '#444', fontWeight: '700' },

  quizCard: { backgroundColor: '#fff', marginHorizontal: 16, padding: 16, borderRadius: 16, gap: 12 },
  word: { fontSize: 24, fontWeight: '800', color: '#111' },
  help: { color: '#666' },
  choice: { backgroundColor: '#f0f0f0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12 },
  choiceText: { color: '#111', fontWeight: '700' },

  resultCard: { backgroundColor: '#fff', marginHorizontal: 16, padding: 16, borderRadius: 16, alignItems: 'center', gap: 8 },
  score: { fontSize: 28, fontWeight: '900', color: '#111' },

  rowItem: { backgroundColor: '#fff', marginHorizontal: 16, padding: 12, borderRadius: 12 },
  rowOK: { borderLeftWidth: 4, borderLeftColor: '#4caf50' },
  rowNG: { borderLeftWidth: 4, borderLeftColor: '#f44336' },
  rowWord: { fontSize: 16, fontWeight: '800', color: '#111' },
  rowDetail: { color: '#444', marginTop: 2 }
});
