import { useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'sys-1',
      role: 'system',
      content:
        'あなたはシチリア語学習の家庭教師です。日本語を用いながら、シチリア語の例文・語彙・発音のヒントを会話形式で教えてください。短く具体的に。差別・プライバシー侵害・自傷/自殺の助長を含む回答はしないでください。'
    },
    {
      id: 'asst-hello',
      role: 'assistant',
      content: 'Ciau! 今日は何を学びたい？（例: あいさつ、自己紹介、旅行会話）'
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Groqを使用する
  const groqKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  const model = 'llama-3.3-70b-versatile';
  const canCallApi = !!groqKey;

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
    setSending(true);

    try {
      const body = {
        model,
        messages: messages
          .concat(userMsg)
          .map(m => ({ role: m.role, content: m.content })),
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
        let errText = '';
        try { errText = await res.text(); } catch {}
        const snippet = errText ? errText.slice(0, 300) : 'レスポンス本文なし';
        console.error(`Groq API Error - Status: ${res.status}, Response:`, snippet);
        console.error('Request URL:', apiUrl);
        console.error('Request Model:', model);
        console.error('API Key present:', !!groqKey);
        throw new Error(`HTTP ${res.status}: ${snippet}`);
      }
      const data = await res.json();
      const content: string = data.choices?.[0]?.message?.content ?? '（応答を取得できませんでした）';

      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content }]);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (e: any) {
      console.error('Groq Chat Error:', e);
      console.error('Error details - Model:', model, 'API Key exists:', !!groqKey);
      const msg = typeof e?.message === 'string' ? e.message : 'AIからの応答に失敗しました。しばらくして再試行してください。';
      Alert.alert('エラー', msg);
      // 失敗時は入力欄に戻す方が親切なため復元
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <Text style={styles.title}>AIに相談</Text>

        {!canCallApi && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>環境変数 EXPO_PUBLIC_GROQ_API_KEY を設定してください。</Text>
          </View>
        )}

        <FlatList
          ref={listRef}
          data={messages.filter(m => m.role !== 'system')}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === 'assistant' ? styles.bubbleAI : styles.bubbleUser]}>
              <Text style={styles.bubbleText}>{item.content}</Text>
            </View>
          )}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="質問を入力（例: 旅行で使う挨拶を教えて）"
            editable={!sending}
            multiline
          />
          <Pressable onPress={send} style={[styles.sendBtn, (sending || !input.trim()) && { opacity: 0.6 }]} disabled={sending || !input.trim()}>
            <Text style={styles.sendBtnText}>{sending ? '送信中' : '送信'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 20, fontWeight: '700', color: '#222', paddingHorizontal: 16, paddingTop: 12 },
  banner: { margin: 16, backgroundColor: '#fff3cd', borderRadius: 12, padding: 12 },
  bannerText: { color: '#7a5c00' },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  bubbleAI: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderTopLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#d1f1ff', borderTopRightRadius: 4 },
  bubbleText: { color: '#222', fontSize: 15 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: '#fff' },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  sendBtn: { backgroundColor: '#111', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '800' }
});
