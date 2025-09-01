import { useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Text style={styles.title}>AIに相談</Text>
            <Text style={styles.subtitle}>シチリア語の先生に質問しよう</Text>
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
          contentContainerStyle={styles.messagesContainer}
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
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="質問を入力（例: 旅行で使う挨拶を教えて）"
              placeholderTextColor="#9ca3af"
              editable={!sending}
              multiline
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
                <Ionicons 
                  name={sending ? "hourglass" : "send"} 
                  size={20} 
                  color="white" 
                />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  bannerText: { 
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
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
  bubbleAI: { 
    alignSelf: 'flex-start', 
    backgroundColor: '#ffffff', 
    borderTopLeftRadius: 8,
  },
  bubbleUser: { 
    alignSelf: 'flex-end', 
    backgroundColor: '#e0f2fe',
    borderTopRightRadius: 8,
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  bubbleRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  bubbleText: { 
    color: '#1f2937', 
    fontSize: 15,
    lineHeight: 22,
  },
  inputContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-end', 
    gap: 12,
  },
  input: { 
    flex: 1, 
    minHeight: 48, 
    maxHeight: 120, 
    borderWidth: 2, 
    borderColor: '#e5e7eb', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    backgroundColor: '#f8fafc',
    fontSize: 15,
    color: '#1f2937',
  },
  sendBtn: { 
    borderRadius: 16,
    overflow: 'hidden',
  },
  sendBtnGradient: {
    width: 48,
    height: 48,
    alignItems: 'center', 
    justifyContent: 'center',
  },
});
