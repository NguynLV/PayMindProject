import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Alert, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useFocusEffect } from 'expo-router';
import { CategoryService, CategoryResponse } from '../src/services/category.service';

type TabType = 'EXPENSE' | 'INCOME';

export default function CategoriesScreen() {
    const router = useRouter();
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
            Alert.alert("Lỗi", "Không thể tải danh sách nhóm");
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
        Alert.alert(
            "Xóa nhóm",
            `Bạn có chắc chắn muốn xóa nhóm "${name}" không?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: "Xóa",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await CategoryService.deleteCategory(id);
                            fetchCategories(); // reload data
                            Alert.alert("Thành công", "Đã xóa nhóm.");
                        } catch (error) {
                            console.log("Lỗi xóa", error);
                            Alert.alert("Lỗi", "Không thể xóa nhóm này.");
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: CategoryResponse }) => (
        <View style={styles.catRow}>
            <View style={[styles.catIcon, { backgroundColor: item.color + '20' }]}>
                <Ionicons name={item.icon as any} size={28} color={item.color} />
            </View>
            <Text style={styles.catName}>{item.name}</Text>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => router.push({ pathname: '/category-form', params: { id: item.id, type: activeTab } })}
                >
                    <Ionicons name="pencil" size={20} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Quản lý Nhóm</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'EXPENSE' && styles.tabActiveExpense]}
                    onPress={() => { setLoading(true); setActiveTab('EXPENSE'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'EXPENSE' && styles.tabTextActive]}>Khoản chi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'INCOME' && styles.tabActiveIncome]}
                    onPress={() => { setLoading(true); setActiveTab('INCOME'); }}
                >
                    <Text style={[styles.tabText, activeTab === 'INCOME' && styles.tabTextActive]}>Khoản thu</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading && !refreshing ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                </View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyText}>Chưa có nhóm nào</Text>
                        </View>
                    }
                    ItemSeparatorComponent={() => <View style={styles.divider} />}
                />
            )}

            {/* FAB Add */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => router.push({ pathname: '/category-form', params: { type: activeTab } })}
            >
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#fff',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#E5E7EB',
    },
    tabActiveExpense: { borderBottomColor: '#EF4444' },
    tabActiveIncome: { borderBottomColor: '#10B981' },
    tabText: { fontSize: 15, fontWeight: '500', color: '#6B7280' },
    tabTextActive: { color: '#111827', fontWeight: 'bold' },

    listContainer: { paddingVertical: 12, paddingHorizontal: 16 },
    catRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    },
    catIcon: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    catName: { flex: 1, fontSize: 16, fontWeight: '600', color: '#111827' },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8 },

    divider: { height: 8 },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 16, fontSize: 15, color: '#9CA3AF' },

    fab: {
        position: 'absolute',
        right: 20,
        bottom: 24,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    }
});
