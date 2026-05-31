import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#4F46E5', // Indigo color for active tabs
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: Platform.OS === 'ios' ? 85 : 75, // Tăng chiều cao trên Android để tránh đè vạch
          paddingBottom: Platform.OS === 'ios' ? 30 : 15, // Tăng thêm bottom padding cho Android
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>

      {/* 1. Trang chủ */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 2. Giao dịch */}
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Giao dịch',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "swap-horizontal" : "swap-horizontal-outline"} size={24} color={color} />
          ),
        }}
      />

      {/* 3. Nút Thêm (Floating Action Button) */}
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => (
            <View style={styles.fabWrapper}>
              <View style={[styles.fab, focused && styles.fabFocused]}>
                <Ionicons name="add" size={22} color="#ffffff" />
              </View>
            </View>
          ),
          // Bỏ chữ "Thêm" dưới nút FAB để icon đứng một mình
          tabBarLabel: () => null,
        }}
      />

      {/* 4. Nhật ký */}
      <Tabs.Screen
        name="diary"
        options={{
          title: 'Nhật ký',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "book" : "book-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 5. Ví tiền (Hidden from bottom tab bar) */}
      <Tabs.Screen
        name="wallet"
        options={{
          href: null,
        }}
      />




      {/* Hidden Routes (Keep for navigation but hide from tab bar) */}
      <Tabs.Screen
        name="assistant"
        options={{
          href: null,
        }}
      />

      {/* 5. Cài đặt */}
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cá nhân',
          tabBarLabel: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* Hide the default explore screen */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
      
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: 'absolute',
    top: -15, // Hạ nút xuống chút theo yêu cầu
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5', // Indigo chủ đạo
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  fabFocused: {
    backgroundColor: '#4338CA', // Màu tối hơn chút khi focus
    transform: [{ scale: 1.05 }],
  }
});
