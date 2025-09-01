import { Text, View, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>シチリア語学習</Text>
        <Text style={styles.subtitle}>美しいシチリアの言葉を学びましょう</Text>
      </View>

      <FlatList
        data={data()}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={item.gradient as any}
              style={styles.cardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.cardContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon as any} size={32} color="white" />
                </View>
                <Text style={styles.cardTitle}>{item.text}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function data() {
  return [
    {
      text: "単語学習",
      route: "/vocabulary",
      description: "基本単語を覚えよう",
      icon: "book-outline",
      gradient: ["#667eea", "#764ba2"],
    },
    {
      text: "クイズ",
      route: "/quiz",
      description: "知識をテストしよう",
      icon: "help-circle-outline",
      gradient: ["#f093fb", "#f5576c"],
    },
    {
      text: "AIに相談",
      route: "/ai-chat",
      description: "AI先生に質問しよう", // ← 最後まで表示される
      icon: "chatbubble-outline",
      gradient: ["#4facfe", "#00f2fe"],
    },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 20,
    marginHorizontal: 4,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    paddingBottom: 24, // 下余白を多めに
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "stretch", // ← 横幅を伸ばす
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
    alignSelf: "center",
  },
  cardDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
    alignSelf: "stretch",
    flexShrink: 1,
    // includeFontPadding: false, // Androidで必要ならON
  },
});
