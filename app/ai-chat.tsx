import { useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export default function AIChat() {
  const insets = useSafeAreaInsets();
  const [inputBarH, setInputBarH] = useState(64); // 入力バー実測高さ（初期値は適当）
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'sys-1',
      role: 'system',
      content: `あなたはシチリア語学習の家庭教師です。
- 日本語を用いながら、シチリア語の例文・語彙・発音のヒントを会話形式で教えてください。短く具体的に。
- 差別・プライバシー侵害・自傷/自殺の助長を含む回答はしないでください。
- ユーザーがシチリア語で話しかけた場合は、原則シチリア語で返答してください。
- ユーザーの文に誤りや不自然な部分があれば、最後に「〇〇（ユーザーの文章）はこのように言うと良いかもしれません: ...」の形式で簡潔に訂正を示してください。
- 正しい場合は訂正コメントは不要です。`
    },
    {
      id: 'asst-hello',
      role: 'assistant',
      content: 'Ciau! 今日は何を学びたい？（例: あいさつ、自己紹介、旅行会話）'
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Groqを使用する
  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const model = 'llama-3.3-70b-versatile';
  const canCallApi = !!groqKey;

  function scrollToBottom(animated = true) {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated }));
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    if (!canCallApi) {
      Alert.alert('APIキー未設定', 'EXPO_PUBLIC_GROQ_API_KEY を設定してください。');
      return;
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    scrollToBottom();

    setSending(true);
    try {
      const body = {
        model,
        messages: messages.concat(userMsg).map(m => ({ role: m.role, content: m.content })),
        temperature: 0.3,
      } as const;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const snippet = (await res.text().catch(() => ''))?.slice(0, 300) || 'レスポンス本文なし';
        throw new Error(`HTTP ${res.status}: ${snippet}`);
      }
      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? '（応答を取得できませんでした）';
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content }]);
      scrollToBottom();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'AIからの応答に失敗しました。もう一度お試しください。';
      Alert.alert('エラー', msg);
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  const onInputLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (Math.abs(h - inputBarH) > 1) {
      setInputBarH(h);
      // 入力バー高さ変化に追従してスクロールを底に
      scrollToBottom(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        // ヘッダー分のオフセットが必要ならここに加算
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>AIチャットで相談しよう</Text>
            <Text style={styles.subtitle}>※回答が100%正しいとは限りません</Text>
          </View>
        </LinearGradient>

        {!canCallApi && (
          <View style={styles.banner}>
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text style={styles.bannerText}>環境変数 EXPO_PUBLIC_GROQ_API_KEY を設定してください。</Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages.filter(m => m.role !== 'system')}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: inputBarH + insets.bottom + 8, // 入力バー分の余白を入れておく
            gap: 16,
          }}
          scrollIndicatorInsets={{ bottom: inputBarH + insets.bottom }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser]}>
              <View style={styles.bubbleHeader}>
                <Ionicons
                  name={item.role === 'assistant' ? 'school' : 'person'}
                  size={16}
                  color={item.role === 'assistant' ? '#4facfe' : '#667eea'}
                />
                <Text style={styles.bubbleRole}>
                  {item.role === 'assistant' ? 'AI先生' : 'あなた'}
                </Text>
              </View>
              <Text style={styles.bubbleText}>{item.content}</Text>
            </View>
          )}
          onContentSizeChange={() => scrollToBottom()}
          onLayout={() => scrollToBottom(false)}
        />

        <View style={[styles.inputContainer, { paddingBottom: 8 + insets.bottom }]} onLayout={onInputLayout}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="質問を入力（例: 旅行で使う挨拶を教えて、〇〇は何と言いますか？）"
              placeholderTextColor="#9ca3af"
              editable={!sending}
              multiline
              onFocus={() => scrollToBottom(false)}
            />
            <Pressable
              onPress={send}
              style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.6 }]}
              disabled={sending || !input.trim()}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.sendBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={sending ? 'hourglass' : 'send'} size={20} color="white" />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerGradient: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '800', color: 'white', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 22 },

  banner: {
    margin: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  bannerText: { color: '#92400e', fontSize: 14, fontWeight: '500', flex: 1 },

  bubble: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderTopLeftRadius: 8 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#e0f2fe', borderTopRightRadius: 8 },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bubbleRole: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  bubbleText: { color: '#1f2937', fontSize: 15, lineHeight: 22 },

  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#1f2937',
  },
  sendBtn: { borderRadius: 16, overflow: 'hidden' },
  sendBtnGradient: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
});
