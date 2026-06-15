import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { NotificationLocalService } from '../src/services/notification-local.service';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

import FloatingAssistant from '../src/components/FloatingAssistant';
import { ToastProvider } from '../src/components/common/Toast';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  useEffect(() => {
    // Schedule daily reminder at 8 PM
    NotificationLocalService.scheduleDailyReminder();

    // Tự động kiểm tra bản cập nhật OTA khi mở app
    const checkUpdates = async () => {
      try {
        if (__DEV__) return; // Không chạy trong chế độ development (expo start)
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Có bản cập nhật mới! 🎉',
            'Ứng dụng vừa tải về bản cập nhật mới. Bạn có muốn khởi động lại để áp dụng ngay không?',
            [
              { text: 'Để sau', style: 'cancel' },
              { text: 'Áp dụng ngay', onPress: () => Updates.reloadAsync() }
            ]
          );
        }
      } catch (error) {
        console.warn('Lỗi khi kiểm tra cập nhật OTA:', error);
      }
    };
    checkUpdates();

    // Fetch Remote Config (Cơ chế gác cổng từ xa)
    const fetchConfig = async () => {
      if (__DEV__) {
        // Trong môi trường test, bỏ qua check config để app khởi động ngay lập tức
        setIsConfigLoaded(true);
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Giới hạn 3 giây
        // Thay link này bằng link thật khi bạn đưa web lên mạng (ví dụ: https://paymind.com/config.json)
        const response = await fetch('https://your-domain-here.com/config.json', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.maintenance) {
            setIsMaintenance(true);
            setMaintenanceMsg(data.maintenanceMessage || 'Hệ thống đang bảo trì.');
          }
          // Gợi ý: Bạn có thể lưu data.geminiApiKey vào AsyncStorage hoặc Context ở đây để các màn hình khác sử dụng
        }
      } catch (error) {
        console.warn('Lỗi khi tải config từ xa, bỏ qua...', error);
      } finally {
        setIsConfigLoaded(true);
      }
    };
    
    fetchConfig();
  }, []);

  // Màn hình chờ tải Config
  if (!isConfigLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  // Màn hình Khóa bảo trì
  if (isMaintenance) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b', padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10b981', marginBottom: 16 }}>Đang Bảo Trì 🛠️</Text>
        <Text style={{ fontSize: 16, color: '#a1a1aa', textAlign: 'center', lineHeight: 24 }}>{maintenanceMsg}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ToastProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
            <Stack.Screen name="notifications" options={{ headerShown: false }} />
            <Stack.Screen name="categories" options={{ headerShown: false }} />
            <Stack.Screen name="category-form" options={{ headerShown: false }} />
            <Stack.Screen name="wallet-form" options={{ headerShown: false }} />
            <Stack.Screen name="budget" options={{ headerShown: false }} />
            <Stack.Screen name="budget-form" options={{ headerShown: false }} />
            <Stack.Screen name="report" options={{ headerShown: false }} />
            <Stack.Screen name="premium" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <FloatingAssistant />
          </ToastProvider>
        </GestureHandlerRootView>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

