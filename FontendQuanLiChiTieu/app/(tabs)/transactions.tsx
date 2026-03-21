import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, ScrollView, Modal, Alert, Platform, Animated, useWindowDimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { TransactionService, TransactionResponse } from '@/services/transaction.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { formatDate, getRelativeDate, formatDateTime } from '@/utils/date';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';

const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);

// Date utility now handles relative labels and formatting

export default function TransactionsScreen() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

    // Pickers Data
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters & Sorting
    const { initialType, startDate, endDate } = useLocalSearchParams<{ initialType?: 'INCOME' | 'EXPENSE', startDate?: string, endDate?: string }>();
    const [filterType, setFilterType] = useState<'INCOME' | 'EXPENSE' | null>(null);
    const [filterWalletId, setFilterWalletId] = useState<number | null>(null);
    const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

    // Modals
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const { width: windowWidth } = useWindowDimensions();
    const [currentCategoryPage, setCurrentCategoryPage] = useState(0);

    // Date Range States
    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
    const [showDateRangeModal, setShowDateRangeModal] = useState(false);
    const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);

    const fetchInitialData = useCallback(async () => {
        try {
            const [txRes, wRes, cExpRes, cIncRes] = await Promise.all([
                TransactionService.getMyTransactions(),
                WalletService.getMyWallets(),
                CategoryService.getMyCategories('EXPENSE'),
                CategoryService.getMyCategories('INCOME')
            ]);
            setTransactions(txRes || []);
            setWallets(wRes || []);
            // Combine categories for filtering with null safety
            setCategories([...(cExpRes || []), ...(cIncRes || [])]);
        } catch (error) {
            console.log("Error fetching transactions/data", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const isClearingParams = useRef(false);

    useFocusEffect(
        useCallback(() => {
            fetchInitialData();
            
            // If we just cleared params, don't reset filters immediately
            if (isClearingParams.current) {
                isClearingParams.current = false;
                return;
            }

            // If we have specific navigation parameters, apply them
            if (initialType || startDate || endDate) {
                if (initialType) {
                    setFilterType(initialType);
                }
                if (startDate) {
                    const start = new Date(startDate);
                    if (!isNaN(start.getTime())) {
                        start.setHours(0, 0, 0, 0);
                        setFilterStartDate(start);
                    }
                }
                if (endDate) {
                    const end = new Date(endDate);
                    if (!isNaN(end.getTime())) {
                        end.setHours(23, 59, 59, 999);
                        setFilterEndDate(end);
                    }
                }
                // Mark that we are clearing params to avoid hit 'else' block in the next cycle
                isClearingParams.current = true;
                // Clear params after consuming them to avoid filter jumping back on focus
                router.setParams({ initialType: undefined, startDate: undefined, endDate: undefined } as any);
            } else {
                // No parameters provided (e.g. standard tab navigation or Home -> "Xem tất cả")
                // Reset all filters to default
                setFilterType(null);
                setFilterWalletId(null);
                setFilterCategoryId(null);
                setFilterStartDate(null);
                setFilterEndDate(null);
                setSearchQuery('');
            }
        }, [fetchInitialData, initialType, startDate, endDate, router])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchInitialData();
    };

    // Group transactions by Date combining all filters and sort order
    const groupedTransactions = useMemo(() => {
        let filtered = (transactions || []).filter(t => {
            if (!t || !t.category || !t.wallet) return false;
            
            // Search text
            const matchesSearch = (t.category.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

            // Filters
            const matchesWallet = filterWalletId ? t.wallet.id === filterWalletId : true;
            const matchesCategory = filterCategoryId ? t.category.id === filterCategoryId : true;
            const matchesType = filterType ? t.type === filterType : true;

            const txDate = new Date(t.transactionDate);
            if (isNaN(txDate.getTime())) return false;
            
            // Ignore time for comparison by creating a date object at start of day
            const txDateStart = new Date(txDate.getFullYear(), txDate.getMonth(), txDate.getDate());

            const matchesStartDate = filterStartDate ? txDateStart >= filterStartDate : true;
            const matchesEndDate = filterEndDate ? txDateStart <= filterEndDate : true;

            return matchesSearch && matchesWallet && matchesCategory && matchesType && matchesStartDate && matchesEndDate;
        });

        const groups: { [key: string]: { data: TransactionResponse[], totalAmount: number } } = {};

        filtered.forEach(t => {
            const dateStr = t.transactionDate.split('T')[0];
            if (!groups[dateStr]) {
                groups[dateStr] = { data: [], totalAmount: 0 };
            }
            groups[dateStr].data.push(t);
            // Calculate daily total depending on income/expense
            if (t.type === 'INCOME') {
                groups[dateStr].totalAmount += t.amount;
            } else {
                groups[dateStr].totalAmount -= t.amount;
            }
        });

        // Convert object to array for SectionList
        let sectionData = Object.keys(groups)
            .map(date => ({
                title: getRelativeDate(date),
                realDate: date,
                totalAmount: groups[date].totalAmount,
                data: groups[date].data.sort((a, b) => {
                    if (sortOrder === 'highest') return b.amount - a.amount;
                    if (sortOrder === 'lowest') return a.amount - b.amount;
                    // For newest/oldest within the same day, sort by time if available
                    const timeA = new Date(a.transactionDate).getTime();
                    const timeB = new Date(b.transactionDate).getTime();
                    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                })
            }));

        // Sort sections by date
        sectionData.sort((a, b) => {
            const timeA = new Date(a.realDate).getTime();
            const timeB = new Date(b.realDate).getTime();
            return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
        });

        return sectionData;

    }, [transactions, searchQuery, filterWalletId, filterCategoryId, sortOrder, filterStartDate, filterEndDate]);

    const handleDelete = async (id: number) => {
        Alert.alert('Xóa giao dịch', 'Bạn có chắc chắn muốn xóa giao dịch này không?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const response = await TransactionService.deleteTransaction(id);
                        Alert.alert('Thành công', response.message || 'Xóa giao dịch thành công');
                        fetchInitialData();
                    } catch (error: any) {
                        Alert.alert('Lỗi', error.message || 'Không thể xóa giao dịch');
                    }
                }
            }
        ]);
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

    const renderItem = ({ item }: { item: TransactionResponse }) => {
        return (
            <Swipeable
                renderRightActions={(_, dragX) => renderRightActions(dragX, item.id)}
                containerStyle={styles.swipeableContainer}
            >
                <TouchableOpacity 
                    style={styles.txRow} 
                    activeOpacity={0.7}
                    onPress={() => {
                        setSelectedTransaction(item);
                        setShowDetailModal(true);
                    }}
                >
                    <View style={[styles.txIcon, { backgroundColor: (item.category.color || '#F3F4F6') + '20' }]}>
                        <Ionicons name={item.category.icon as any} size={28} color={item.category.color || '#6B7280'} />
                    </View>
                    <View style={styles.txInfo}>
                        <Text style={styles.txName}>{item.category.name}</Text>
                        <Text style={styles.txDesc} numberOfLines={1}>{item.description || item.wallet.name}</Text>
                    </View>
                    <View style={styles.txAmountContainer}>
                        <Text style={[styles.txAmount, { color: item.type === 'INCOME' ? '#10B981' : '#111827' }]}>
                            {item.type === 'INCOME' ? '+' : '-'}{formatVND(item.amount)} đ
                        </Text>
                    </View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderSectionHeader = ({ section }: { section: { title: string; totalAmount: number } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.dailyTotalPill, { backgroundColor: section.totalAmount >= 0 ? '#DEF7EC' : '#FDE8E8' }]}>
                <Text style={[styles.dailyTotalText, { color: section.totalAmount >= 0 ? '#059669' : '#C81E1E' }]}>
                    {section.totalAmount > 0 ? '+' : ''}{formatVND(section.totalAmount)} đ
                </Text>
            </View>
        </View>
    );

    const isFiltered = filterWalletId || filterCategoryId || searchQuery || filterStartDate || filterEndDate;

    const selectedWallet = wallets.find(w => w.id === filterWalletId);
    const selectedCategory = categories.find(c => c.id === filterCategoryId);

    const formatDateRange = (start: Date | null, end: Date | null) => {
        if (start && end) {
            return `${formatDate(start).substring(0, 5)} - ${formatDate(end).substring(0, 5)}`;
        }
        if (start) return `Từ ${formatDate(start).substring(0, 5)}`;
        if (end) return `Đến ${formatDate(end).substring(0, 5)}`;
        return 'Thời gian';
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Main Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Giao dịch</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm giao dịch..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                <TouchableOpacity style={styles.filterIconBtn} onPress={() => setShowSortModal(true)}>
                    <View style={styles.sortIconContainer}>
                        <Ionicons name="swap-vertical" size={20} color="#3B82F6" />
                        <Text style={styles.sortBtnText}>Sắp xếp</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                    <TouchableOpacity
                        style={[styles.filterPill, !isFiltered && !filterType ? styles.filterPillActive : null]}
                        onPress={() => {
                            setFilterCategoryId(null);
                            setFilterWalletId(null);
                            setFilterStartDate(null);
                            setFilterEndDate(null);
                            setFilterType(null);
                            setSearchQuery('');
                        }}
                    >
                        <Text style={[styles.filterPillText, !isFiltered && !filterType ? styles.filterPillTextActive : null]}>Tất cả</Text>
                    </TouchableOpacity>

                    {/* Type Filter Pill */}
                    {filterType && (
                        <View style={[styles.filterPill, styles.filterPillActiveOutline]}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                onPress={() => setFilterType(filterType === 'INCOME' ? 'EXPENSE' : 'INCOME')}
                            >
                                <Ionicons 
                                    name={filterType === 'INCOME' ? "add-circle-outline" : "remove-circle-outline"} 
                                    size={16} 
                                    color="#3B82F6" 
                                    style={{ marginRight: 6 }} 
                                />
                                <Text style={[styles.filterPillText, styles.filterPillTextActiveOutline]}>
                                    {filterType === 'INCOME' ? 'Thu nhập' : 'Chi tiêu'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => setFilterType(null)}
                            >
                                <Ionicons name="close-circle" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[styles.filterPill, (filterStartDate || filterEndDate) ? styles.filterPillActiveOutline : null]}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowDateRangeModal(true)}
                        >
                            <Ionicons name="calendar-outline" size={16} color={(filterStartDate || filterEndDate) ? "#3B82F6" : "#4B5563"} style={{ marginRight: 6 }} />
                            <Text style={[styles.filterPillText, (filterStartDate || filterEndDate) ? styles.filterPillTextActiveOutline : null]}>
                                {formatDateRange(filterStartDate, filterEndDate)}
                            </Text>
                        </TouchableOpacity>
                        {(filterStartDate || filterEndDate) && (
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => { setFilterStartDate(null); setFilterEndDate(null); }}
                            >
                                <Ionicons name="close-circle" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.filterPill, filterCategoryId ? styles.filterPillActiveOutline : null]}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowCategoryModal(true)}
                        >
                            <Ionicons name="grid-outline" size={16} color={filterCategoryId ? "#3B82F6" : "#4B5563"} style={{ marginRight: 6 }} />
                            <Text style={[styles.filterPillText, filterCategoryId ? styles.filterPillTextActiveOutline : null]}>
                                {selectedCategory ? selectedCategory.name : 'Danh mục'}
                            </Text>
                        </TouchableOpacity>
                        {filterCategoryId && (
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => setFilterCategoryId(null)}
                            >
                                <Ionicons name="close-circle" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.filterPill, filterWalletId ? styles.filterPillActiveOutline : null]}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowWalletModal(true)}
                        >
                            <Ionicons name="wallet-outline" size={16} color={filterWalletId ? "#3B82F6" : "#4B5563"} style={{ marginRight: 6 }} />
                            <Text style={[styles.filterPillText, filterWalletId ? styles.filterPillTextActiveOutline : null]}>
                                {selectedWallet ? selectedWallet.name : 'Ví tiền'}
                            </Text>
                        </TouchableOpacity>
                        {filterWalletId && (
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => setFilterWalletId(null)}
                            >
                                <Ionicons name="close-circle" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* Transactions List Grouped by Date */}
            <SectionList
                sections={groupedTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.listContainer}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={64} color="#E5E7EB" />
                        <Text style={styles.emptyText}>Chưa có giao dịch phù hợp.</Text>
                    </View>
                }
                ItemSeparatorComponent={() => <View style={styles.divider} />}
            />

            {/* Modal for Categories */}
            <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Lọc theo Danh Mục</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <View>
                            <ScrollView
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={(e) => {
                                    const offset = e.nativeEvent.contentOffset.x;
                                    const width = e.nativeEvent.layoutMeasurement.width;
                                    setCurrentCategoryPage(Math.round(offset / width));
                                }}
                                scrollEventThrottle={16}
                                style={{ marginHorizontal: -20 }}
                            >
                                {(() => {
                                    const items = [
                                        { type: 'all' as const, data: null },
                                        ...categories.map(cat => ({ type: 'category' as const, data: cat }))
                                    ];
                                    const pages: any[][] = [];
                                    for (let i = 0; i < items.length; i += 8) {
                                        pages.push(items.slice(i, i + 8));
                                    }

                                    return pages.map((page, pageIndex) => (
                                        <View key={pageIndex} style={{ width: windowWidth - 40, paddingHorizontal: 0 }}>
                                            <View style={styles.gridContainer}>
                                                {page.map((item, idx) => {
                                                    if (item.type === 'category') {
                                                        const cat = item.data;
                                                        const isSelected = filterCategoryId === cat?.id;
                                                        return (
                                                            <TouchableOpacity
                                                                key={cat?.id}
                                                                style={styles.gridItem}
                                                                onPress={() => {
                                                                    setFilterCategoryId(cat?.id || null);
                                                                    setShowCategoryModal(false);
                                                                }}
                                                            >
                                                                <View style={[
                                                                    styles.gridIconBox, 
                                                                    { backgroundColor: (cat?.color || '#000') + '15' },
                                                                    isSelected && { borderWidth: 2.5, borderColor: cat?.color }
                                                                ]}>
                                                                    <Ionicons name={cat?.icon as any} size={28} color={cat?.color} />
                                                                    {isSelected && (
                                                                        <View style={[styles.checkBadge, { backgroundColor: cat?.color }]}>
                                                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[styles.gridItemText, isSelected && { color: cat?.color, fontWeight: '700' }]}>{cat?.name}</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    } else {
                                                        const isSelected = filterCategoryId === null;
                                                        return (
                                                            <TouchableOpacity
                                                                key="all-filter"
                                                                style={styles.gridItem}
                                                                onPress={() => { setFilterCategoryId(null); setShowCategoryModal(false); }}
                                                            >
                                                                <View style={[
                                                                    styles.gridIconBox, 
                                                                    { backgroundColor: '#F3F4F6' },
                                                                    isSelected && { borderWidth: 2.5, borderColor: '#6B7280' }
                                                                ]}>
                                                                    <Ionicons name="layers-outline" size={28} color="#6B7280" />
                                                                    {isSelected && (
                                                                        <View style={[styles.checkBadge, { backgroundColor: '#6B7280' }]}>
                                                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[styles.gridItemText, isSelected && { color: '#6B7280', fontWeight: '700' }]}>Tất cả</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    }
                                                })}
                                            </View>
                                        </View>
                                    ));
                                })()}
                            </ScrollView>

                            {/* Pagination Dots */}
                            {(categories.length + 1) > 8 && (
                                <View style={styles.paginationDots}>
                                    {Array.from({ length: Math.ceil((categories.length + 1) / 8) }).map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.dot,
                                                currentCategoryPage === i && styles.dotActive
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal for Wallets */}
            <Modal visible={showWalletModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Lọc theo Ví</Text>
                            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity
                                style={styles.listRow}
                                onPress={() => { setFilterWalletId(null); setShowWalletModal(false); }}
                            >
                                <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                                    <Ionicons name="layers-outline" size={24} color="#6B7280" />
                                </View>
                                <View style={styles.walletInfo}>
                                    <Text style={styles.walletName}>Tất cả ví</Text>
                                </View>
                            </TouchableOpacity>
                            {wallets.map(w => (
                                <TouchableOpacity
                                    key={w.id}
                                    style={styles.listRow}
                                    onPress={() => {
                                        setFilterWalletId(w.id);
                                        setShowWalletModal(false);
                                    }}
                                >
                                    <View style={styles.iconBox}>
                                        <Ionicons name="wallet" size={24} color="#4F46E5" />
                                    </View>
                                    <View style={styles.walletInfo}>
                                        <Text style={styles.walletName}>{w.name}</Text>
                                        <Text style={styles.walletBal}>{w.balance.toLocaleString('vi-VN')} đ</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal for Date Range */}
            <CustomDatePicker
                visible={showDateRangeModal}
                mode="range"
                initialDate={filterStartDate || new Date()}
                initialEndDate={filterEndDate || new Date()}
                onClose={() => setShowDateRangeModal(false)}
                onSelectRange={(start, end) => {
                    if (start > end) {
                        Alert.alert("Lỗi", "Ngày bắt đầu không được sau ngày kết thúc");
                        return;
                    }
                    setFilterStartDate(start);
                    setFilterEndDate(end);
                    setShowDateRangeModal(false);
                }}
            />

            {/* Modal for Sorting Options */}
            <Modal visible={showSortModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '50%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sắp xếp giao dịch</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('newest'); setShowSortModal(false); }}>
                                <Text style={[styles.walletName, sortOrder === 'newest' ? { color: '#3B82F6', fontWeight: 'bold' as const } : null]}>Mới nhất</Text>
                                {sortOrder === 'newest' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('oldest'); setShowSortModal(false); }}>
                                <Text style={[styles.walletName, sortOrder === 'oldest' ? { color: '#3B82F6', fontWeight: 'bold' as const } : null]}>Cũ nhất</Text>
                                {sortOrder === 'oldest' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('highest'); setShowSortModal(false); }}>
                                <Text style={[styles.walletName, sortOrder === 'highest' ? { color: '#3B82F6', fontWeight: 'bold' as const } : null]}>Số tiền cao nhất</Text>
                                {sortOrder === 'highest' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('lowest'); setShowSortModal(false); }}>
                                <Text style={[styles.walletName, sortOrder === 'lowest' ? { color: '#3B82F6', fontWeight: 'bold' as const } : null]}>Số tiền thấp nhất</Text>
                                {sortOrder === 'lowest' && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Modal for Transaction Details */}
            <Modal visible={showDetailModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.detailModalTitle}>Chi tiết giao dịch</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailHeader}>
                                    <View style={[styles.detailIcon, { backgroundColor: selectedTransaction.category.color + '20' }]}>
                                        <Ionicons name={selectedTransaction.category.icon as any} size={40} color={selectedTransaction.category.color} />
                                    </View>
                                    <Text style={styles.detailCategoryName}>{selectedTransaction.category.name}</Text>
                                    <Text style={[styles.detailAmount, { color: selectedTransaction.type === 'INCOME' ? '#10B981' : '#EF4444' }]}>
                                        {selectedTransaction.type === 'INCOME' ? '+' : '-'}{formatVND(selectedTransaction.amount)} đ
                                    </Text>
                                </View>

                                <View style={styles.detailSection}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="time-outline" size={20} color="#6B7280" style={styles.detailRowIcon} />
                                        <View>
                                            <Text style={styles.detailLabel}>Thời gian</Text>
                                            <Text style={styles.detailValue}>
                                                {formatDateTime(selectedTransaction.transactionDate)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <Ionicons name="wallet-outline" size={20} color="#6B7280" style={styles.detailRowIcon} />
                                        <View>
                                            <Text style={styles.detailLabel}>Tài khoản / Ví</Text>
                                            <Text style={styles.detailValue}>{selectedTransaction.wallet.name}</Text>
                                        </View>
                                    </View>

                                    {selectedTransaction.description && (
                                        <View style={styles.detailRow}>
                                            <Ionicons name="document-text-outline" size={20} color="#6B7280" style={styles.detailRowIcon} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detailLabel}>Ghi chú</Text>
                                                <Text style={styles.detailValue}>{selectedTransaction.description}</Text>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.detailRow}>
                                        <Ionicons name="swap-horizontal-outline" size={20} color="#6B7280" style={styles.detailRowIcon} />
                                        <View>
                                            <Text style={styles.detailLabel}>Loại giao dịch</Text>
                                            <Text style={[styles.detailValue, { color: selectedTransaction.type === 'INCOME' ? '#059669' : '#C81E1E' }]}>
                                                {selectedTransaction.type === 'INCOME' ? 'Khoản thu' : 'Khoản chi'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    style={styles.detailDeleteBtn}
                                    onPress={() => {
                                        setShowDetailModal(false);
                                        handleDelete(selectedTransaction.id);
                                    }}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                                    <Text style={styles.detailDeleteBtnText}>Xóa giao dịch này</Text>
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, backgroundColor: '#fff' },
    headerIcon: { padding: 8 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },

    // Search
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', marginHorizontal: 16, borderRadius: 24, paddingHorizontal: 16, height: 48, marginBottom: 16 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 15, color: '#111827' },
    filterIconBtn: { paddingLeft: 12 },

    // Filter Pills
    filterPillsContainer: { marginBottom: 12 },
    filterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
    filterPillActive: { backgroundColor: '#3B82F6' },
    filterPillText: { fontSize: 14, fontWeight: '500', color: '#4B5563' },
    filterPillTextActive: { color: '#ffffff' },

    filterPillActiveOutline: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE' },
    filterPillTextActiveOutline: { color: '#1D4ED8' },
    clearFilterBtn: { marginLeft: 8, padding: 2 },

    // List
    listContainer: { paddingBottom: 40 },

    // Section Headers
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#ffffff' },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    dailyTotalPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    dailyTotalText: { fontSize: 13, fontWeight: '600' },

    // Rows
    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 14 },
    txIcon: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    txInfo: { flex: 1, marginLeft: 16, marginRight: 16 },
    txName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    txDesc: { fontSize: 14, color: '#6B7280', marginTop: 4 },

    txAmountContainer: { alignItems: 'flex-end' },
    txAmount: { fontSize: 16, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#F9FAFB', marginLeft: 86 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 16, fontSize: 15, color: '#9CA3AF' },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

    // Category Grid
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    gridItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
    gridIconBox: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    gridItemText: { fontSize: 12, color: '#374151', textAlign: 'center' },

    // Wallet List
    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    walletInfo: { flex: 1 },
    walletName: { fontSize: 16, fontWeight: '500', color: '#111827' },
    walletBal: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    iconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    swipeableContainer: { backgroundColor: '#fff' },
    deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 },
    deleteTextContainer: { justifyContent: 'center', alignItems: 'center' },

    // Sort Button in Search
    sortIconContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F2FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    sortBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6', marginLeft: 4 },

    // Date Picker Modal
    dateSelectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    dateInput: { flex: 1, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center' },
    dateInputActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
    dateLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
    dateValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
    dateSeparator: { width: 12, height: 2, backgroundColor: '#D1D5DB', marginHorizontal: 10 },
    pickerContainer: { marginBottom: 20, backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
    doneBtn: { alignSelf: 'center', padding: 10 },
    doneBtnText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 16 },
    applyBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 12, alignItems: 'center' },
    applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    // Category Pagination Dots
    paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB', marginHorizontal: 4 },
    dotActive: { backgroundColor: '#3B82F6', width: 20 },
    checkBadge: {
        position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
    },

    // Transaction Details Modal
    detailModalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    detailHeader: { alignItems: 'center', marginVertical: 20 },
    detailIcon: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    detailCategoryName: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    detailAmount: { fontSize: 28, fontWeight: '800', marginTop: 8 },
    detailSection: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 20 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
    detailRowIcon: { marginRight: 12, marginTop: 2 },
    detailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
    detailValue: { fontSize: 15, fontWeight: '600', color: '#111827' },
    detailDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
    detailDeleteBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});
