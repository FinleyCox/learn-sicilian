import { Text, View, StyleSheet } from "react-native";

export default function Vocabulary() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>単語学習</Text>
      <Text style={styles.subtitle}>シシリア語の単語を学びましょう</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center'
  }
});
