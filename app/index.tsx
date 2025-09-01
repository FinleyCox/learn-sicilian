import { Text, View, FlatList, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={data()}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={{ 
              padding: 15, 
              borderBottomWidth: 5, 
              borderBottomColor: '#e0e0e0',
              backgroundColor: 'white',
              marginVertical: 2,
              height: 100,
              marginTop: 45,
              marginBottom: 20,
              borderRadius: 8,
              justifyContent: 'center',
              alignItems: 'center'
            }}
            onPress={() => router.push(item.route as any)}
          >
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{item.text}</Text>
          </TouchableOpacity>
        )}
        style={{ flex: 1, marginBottom: 20 }}
      />
    </SafeAreaView>
  );
}

// dataの中身：画面遷移先
function data() {
  return [
    { text: '単語', route: '/vocabulary' },
    { text: 'クイズ', route: '/quiz' },
    { text: 'AIに相談', route: '/ai-chat' },
  ]
}