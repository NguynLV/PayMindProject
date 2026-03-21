import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Platform, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import Constants from 'expo-constants';
import { NotificationService, NotificationResponse } from '../src/services/notification.service';
import { formatDateTime } from '../src/utils/date';

export default function NotificationsScreen() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadNotifications = async () => {
        try {
            const data = await NotificationService.getMyNotifications();
            setNotifications(data);
        } catch (error) {
            console.warn('Failed to load notifications', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadNotifications();
    }, []);

    const handleRead = async (id: number) => {
        try {
            await NotificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.warn('Failed to mark as read', error);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await NotificationService.deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.warn('Failed to delete notification', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'BUDGET_ALERT': return 'alert-circle';
            case 'REMINDER': return 'alarm-outline';
            default: return 'notifications-outline';
        }
    };

    const getIconColor = (type: string) => {
        switch (type) {
            case 'BUDGET_ALERT': return '#EF4444';
            case 'REMINDER': return '#F59E0B';
            default: return '#3B82F6';
        }
    };

    const renderRightActions = (dragX: Animated.AnimatedInterpolation<number>, id: number) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(id)}>
                <Animated.View style={[styles.deleteTextContainer, { transform: [{ scale: trans }] }]}>
                    <Ionicons name="trash-outline" size={24} color="#fff" />
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item }: { item: NotificationResponse }) => (
        <Swipeable
            renderRightActions={(_, dragX) => renderRightActions(dragX, item.id)}
            containerStyle={styles.swipeableContainer}
        >
            <TouchableOpacity
                style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
                onPress={() => router.push({ pathname: '/notification-detail/[id]', params: { id: item.id } })}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) + '15' }]}>
                    <Ionicons name={getIcon(item.type) as any} size={24} color={getIconColor(item.type)} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
                    <Text style={styles.content}>{item.content}</Text>
                    <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        </Swipeable>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông báo</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Bạn chưa có thông báo nào</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    listContainer: { paddingBottom: 20 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    notificationItem: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
    unreadItem: { backgroundColor: '#F5F3FF' },
    iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    textContainer: { flex: 1 },
    title: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
    unreadText: { color: '#111827', fontWeight: '700' },
    content: { fontSize: 14, color: '#6B7280', marginBottom: 6, lineHeight: 20 },
    time: { fontSize: 12, color: '#9CA3AF' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED', marginLeft: 8 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, color: '#9CA3AF', fontSize: 16 },
    swipeableContainer: {
        backgroundColor: '#fff',
    },
    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    deleteTextContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
