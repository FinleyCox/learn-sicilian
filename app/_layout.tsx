import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'transparent',
        },
        headerTintColor: '#1f2937',
        headerTitle: '',
        headerShadowVisible: false,
      }}
    />
  );
}
