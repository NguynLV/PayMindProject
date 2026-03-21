import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UserService, { UserProfile } from '@/services/user.service';
import { getToken } from '@/services/api';

const GENDER_LABEL: Record<string, string> = {
    NAM: 'Nam', NU: 'Nữ', KHAC: 'Khác',
};

const CURRENCY_LABEL: Record<string, string> = {
    VND: '🇻🇳  VND — Việt Nam Đồng',
    USD: '🇺🇸  USD — US Dollar',
    EUR: '🇪🇺  EUR — Euro',
    JPY: '🇯🇵  JPY — Nhật Yên',
    KRW: '🇰🇷  KRW — Won Hàn Quốc',
    CNY: '🇨🇳  CNY — Nhân Dân Tệ',
};

function Avatar({ firstName, lastName, avatarUrl, onEdit }: { firstName: string; lastName: string; avatarUrl?: string; onEdit: () => void }) {
    const initials = `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
    return (
        <TouchableOpacity style={styles.avatarContainer} onPress={onEdit} activeOpacity={0.9}>
            <View style={styles.avatar}>
                {avatarUrl
                    ? <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                    : initials
                        ? <Text style={styles.avatarText}>{initials}</Text>
                        : <Ionicons name="person" size={50} color="rgba(255,255,255,0.9)" />
                }
            </View>
            <View style={styles.editBadge}>
                <Ionicons name="pencil" size={12} color="#fff" />
            </View>
        </TouchableOpacity>
    );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
                <Ionicons name={icon as any} size={20} color="#5B50DF" />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{value || '—'}</Text>
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
                <ActivityIndicator size="large" color="#5B50DF" />
            </View>
        );
    }

    const formatDate = (d?: string) => {
        if (!d) return '';
        const [y, m, dd] = d.split('-');
        return `${dd}/${m}/${y}`;
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* The White background (replacing purple) */}
            <View style={[styles.topWhiteBg, { height: 320 + insets.top }]} />

            <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
                    <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => router.push({ pathname: '/edit-profile', params: { user: JSON.stringify(user) } })}
                    >
                        <MaterialCommunityIcons name="pencil" size={20} color="#111827" />
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
                        <Text style={styles.cardTitle}>THÔNG TIN CHUNG</Text>
                        <InfoRow icon="person-outline" label="Họ" value={user?.lastName ?? ''} />
                        <View style={styles.divider} />
                        <InfoRow icon="person-outline" label="Tên" value={user?.firstName ?? ''} />
                        <View style={styles.divider} />
                        <InfoRow icon="call-outline" label="Số điện thoại" value={user?.phone ?? ''} />
                        <View style={styles.divider} />
                        <InfoRow icon="calendar-outline" label="Ngày sinh" value={formatDate(user?.birthday)} />
                        <View style={styles.divider} />
                        <View style={styles.divider} />
                        <InfoRow icon="male-female-outline" label="Giới tính" value={GENDER_LABEL[user?.gender ?? ''] ?? ''} />
                    </View>
                    <View style={{ height: 20 }} />
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#ffffff' },
    safe: { flex: 1 },
    topWhiteBg: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: '#ffffff', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },

    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, color: '#111827', fontSize: 20, fontWeight: '700', textAlign: 'center' },

    scroll: { paddingBottom: 12 },
    avatarSection: { alignItems: 'center', paddingTop: 10, paddingBottom: 30 },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E0CCBC', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#F3F4F6', overflow: 'hidden' },
    avatarImg: { width: 120, height: 120, borderRadius: 60 },
    avatarText: { fontSize: 44, fontWeight: '800', color: '#fff' },
    editBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    fullName: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
    email: { fontSize: 15, color: '#6B7280' },

    card: { backgroundColor: '#fff', borderRadius: 30, marginHorizontal: 16, padding: 20, paddingVertical: 24, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', letterSpacing: 0.5, marginBottom: 16, marginLeft: 4 },

    infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
    infoIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    infoContent: { flex: 1 },
    infoLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: '700', color: '#111827' },
    divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 }
});
