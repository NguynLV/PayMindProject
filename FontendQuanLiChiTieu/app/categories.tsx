import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useFocusEffect } from 'expo-router';
import { CategoryService, CategoryResponse } from '../src/services/category.service';
import { useToast } from '../src/components/common/Toast';

type TabType = 'EXPENSE' | 'INCOME';

export default function CategoriesScreen() {
    const router = useRouter();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('EXPENSE');
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await CategoryService.getMyCategories(activeTab);
            setCategories(data);
        } catch (error) {
            console.log("Error fetching categories", error);
            toast.error('Không tải được!', 'Không thể tải danh sách nhóm lúc này.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeTab]);

    useFocusEffect(
        useCallback(() => {
            fetchCategories();
        }, [fetchCategories])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchCategories();
    };

    const handleDelete = (id: number, name: string) => {
        toast.confirm(
            `Xóa nhóm "${name}"?`,
            'Xóa rồi không lấy lại được đâu nha!',
            async () => {
                try {
                    setLoading(true);
                    await CategoryService.deleteCategory(id);
                    fetchCategories();
                    toast.success('Xóa xong rồi! 👋', `Nhóm "${name}" đã được xóa.`);
                } catch (error) {
                    console.log("Lỗi xóa", error);
                    toast.error('Xóa thất bại!', 'Không thể xóa nhóm này.');
                    setLoading(false);
                }
            },
            'Xóa thôi',
            'Thôi giữ lại'
        );
    };

    const renderItem = ({ item }: { item: CategoryResponse }) => (
        <View style={styles.catRow}>
            <View style={[styles.catIcon, { backgroundColor: item.color ? item.color + '15' : '#F8FAFC' }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color || '#6366F1'} />
            </View>
            <Text style={styles.catName}>{item.name}</Text>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({ pathname: '/category-form', params: { id: item.id, type: activeTab } })}
                    activeOpacity={0.6}
                >
                    <Ionicons name="create-outline" size={18} color="#6366F1" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => handleDelete(item.id, item.name)}
                    activeOpacity={0.6}
                >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Header */}
            <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 12 : 8 }]}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Quản Lý Nhóm</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Segmented Controller Tab */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'EXPENSE' && styles.tabActive]}
                    onPress={() => { setLoading(true); setActiveTab('EXPENSE'); }}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'EXPENSE' && styles.tabTextActive]}>Khoản Chi Tiêu</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'INCOME' && styles.tabActive]}
                    onPress={() => { setLoading(true); setActiveTab('INCOME'); }}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'INCOME' && styles.tabTextActive]}>Khoản Thu Nhập</Text>
                </TouchableOpacity>
            </View>

            {/* Category List */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="folder-open-outline" size={48} color="#94A3B8" />
                            </View>
                            <Text style={styles.emptyText}>Chưa lập nhóm nào</Text>
                            <Text style={styles.emptySubText}>Tạo các nhóm riêng biệt giúp bạn phân loại và kiểm soát các chi phí dễ dàng hơn.</Text>
                        </View>
                    }
                />
            )}

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push({ pathname: '/category-form', params: { type: activeTab } })}
                activeOpacity={0.95}
            >
                <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },

    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        marginHorizontal: 16,
        marginVertical: 12,
        padding: 3,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 11,
    },
    tabActive: { 
        backgroundColor: '#FFFFFF', 
        shadowColor: '#6366F1', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.05, 
        shadowRadius: 6, 
        elevation: 1 
    },
    tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    tabTextActive: { color: '#6366F1', fontWeight: '700' },

    listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
    catRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    catIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    catName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1F2937' },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: { width: 34, height: 34, backgroundColor: '#EEF2FF', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 20 },
    emptyIconContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyText: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
    emptySubText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
    }
});
