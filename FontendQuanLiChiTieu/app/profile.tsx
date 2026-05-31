import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Image, Platform, SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserService, { UserProfile } from '@/services/user.service';
import { getToken } from '@/services/api';

const GENDER_LABEL: Record<string, string> = {
    NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác',
};

function Avatar({ firstName, lastName, avatarUrl, onEdit }: { firstName: string; lastName: string; avatarUrl?: string; onEdit: () => void }) {
    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
    return (
        <TouchableOpacity style={styles.avatarContainer} onPress={onEdit} activeOpacity={0.9}>
            <View style={styles.avatar}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : initials ? (
                    <Text style={styles.avatarText}>{initials}</Text>
                ) : (
                    <Ionicons name="person" size={40} color="#64748B" />
                )}
            </View>
            <View style={styles.editBadge}>
                <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            </View>
        </TouchableOpacity>
    );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
                <Ionicons name={icon as any} size={18} color="#6366F1" />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text>
            </View>
        </View>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            getToken().then(token => {
                if (!token) {
                    setLoading(false);
                    return;
                }
                setLoading(true);
                UserService.getMyProfile()
                    .then(setUser)
                    .catch(() => router.replace('/auth/login'))
                    .finally(() => setLoading(false));
            });
        }, [])
    );

    if (loading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    const formatDate = (d?: string) => {
        if (!d) return '';
        const [y, m, dd] = d.split('-');
        return `${dd}/${m}/${y}`;
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 : 8 }]}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông Tin Cá Nhân</Text>
                <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => router.push({ pathname: '/edit-profile', params: { user: JSON.stringify(user) } })}
                    activeOpacity={0.7}
                >
                    <Ionicons name="create-outline" size={22} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Avatar section */}
                <View style={styles.avatarSection}>
                    <Avatar
                        firstName={user?.firstName ?? ''}
                        lastName={user?.lastName ?? ''}
                        avatarUrl={user?.avatarUrl}
                        onEdit={() => router.push({ pathname: '/edit-profile', params: { user: JSON.stringify(user) } })}
                    />
                    <Text style={styles.fullName}>{user?.firstName} {user?.lastName}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                {/* Info card */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>THÔNG TIN HỒ SƠ</Text>
                    <InfoRow icon="person-outline" label="Họ" value={user?.lastName ?? ''} />
                    <View style={styles.divider} />
                    <InfoRow icon="person-outline" label="Tên" value={user?.firstName ?? ''} />
                    <View style={styles.divider} />
                    <InfoRow icon="calendar-outline" label="Ngày sinh" value={formatDate(user?.birthday)} />
                    <View style={styles.divider} />
                    <InfoRow icon="male-female-outline" label="Giới tính" value={GENDER_LABEL[user?.gender ?? ''] ?? ''} />
                </View>
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    scroll: { paddingBottom: 30, paddingHorizontal: 16, paddingTop: 16 },
    avatarSection: { alignItems: 'center', paddingBottom: 24 },
    avatarContainer: { position: 'relative', marginBottom: 14 },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#EEF2FF', overflow: 'hidden' },
    avatarImg: { width: 100, height: 100, borderRadius: 50 },
    avatarText: { fontSize: 36, fontWeight: '700', color: '#6366F1' },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
        elevation: 2,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    fullName: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 4 },
    email: { fontSize: 13, color: '#64748B', fontWeight: '500' },

    card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, paddingVertical: 20, borderWidth: 1, borderColor: '#F1F5F9' },
    cardTitle: { fontSize: 11, fontWeight: '700', color: '#64748B', letterSpacing: 0.5, marginBottom: 16, marginLeft: 4 },

    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    infoIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 11, color: '#64748B', fontWeight: '500', marginBottom: 2 },
    infoValue: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 54 }
});
