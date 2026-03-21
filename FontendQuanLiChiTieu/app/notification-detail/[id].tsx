import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { NotificationService, NotificationResponse } from '../../src/services/notification.service';

export default function NotificationDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [notification, setNotification] = useState<NotificationResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadNotification = async () => {
            try {
                if (id) {
                    const data = await NotificationService.getNotificationById(Number(id));
                    setNotification(data);
                    if (!data.isRead) {
                        await NotificationService.markAsRead(Number(id));
                    }
                }
            } catch (error) {
                console.warn('Failed to load notification details', error);
            } finally {
                setLoading(false);
            }
        };

        loadNotification();
    }, [id]);

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

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết thông báo</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                </View>
            ) : !notification ? (
                <View style={styles.center}>
                    <Text style={styles.errorText}>Không tìm thấy thông báo</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.contentContainer}>
                    <View style={styles.detailCard}>
                        <View style={[styles.iconContainer, { backgroundColor: getIconColor(notification.type) + '15' }]}>
                            <Ionicons name={getIcon(notification.type) as any} size={40} color={getIconColor(notification.type)} />
                        </View>

                        <Text style={styles.title}>{notification.title}</Text>
                        <Text style={styles.time}>{new Date(notification.createdAt).toLocaleString('vi-VN')}</Text>

                        <View style={styles.divider} />

                        <Text style={styles.content}>{notification.content}</Text>
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
        paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827'
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    contentContainer: {
        padding: 16
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    detailCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8
    },
    time: {
        fontSize: 14,
        color: '#9CA3AF',
        marginBottom: 24
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 24
    },
    content: {
        fontSize: 16,
        color: '#4B5563',
        lineHeight: 24,
        textAlign: 'left',
        width: '100%'
    },
    errorText: {
        fontSize: 16,
        color: '#6B7280'
    }
});
