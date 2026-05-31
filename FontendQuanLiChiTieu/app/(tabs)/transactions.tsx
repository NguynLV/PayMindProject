import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, ScrollView, Modal, Platform, Animated, useWindowDimensions, StatusBar, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TransactionService, TransactionResponse } from '@/services/transaction.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { formatDate, getRelativeDate, formatDateTime } from '@/utils/date';
import { CustomDatePicker } from '@/components/common/CustomDatePicker';
import { useToast } from '@/components/common/Toast';

const { width } = Dimensions.get('window');
const formatVND = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);

export default function TransactionsScreen() {
    const router = useRouter();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [transactions, setTransactions] = useState<TransactionResponse[]>([]);

    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { initialType, startDate, endDate } = useLocalSearchParams<{ initialType?: 'INCOME' | 'EXPENSE', startDate?: string, endDate?: string }>();
    const [filterType, setFilterType] = useState<'INCOME' | 'EXPENSE' | null>(null);
    const [filterWalletId, setFilterWalletId] = useState<number | null>(null);
    const [filterCategoryId, setFilterCategoryId] = useState<number | null>(null);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSortModal, setShowSortModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const { width: windowWidth } = useWindowDimensions();
    const [currentCategoryPage, setCurrentCategoryPage] = useState(0);

    const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
    const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
    const [showDateRangeModal, setShowDateRangeModal] = useState(false);

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
            
            if (isClearingParams.current) {
                isClearingParams.current = false;
                return;
            }

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
                isClearingParams.current = true;
                router.setParams({ initialType: undefined, startDate: undefined, endDate: undefined } as any);
            } else {
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

    const groupedTransactions = useMemo(() => {
        let filtered = (transactions || []).filter(t => {
            if (!t || !t.category || !t.wallet) return false;
            
            const matchesSearch = (t.category.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesWallet = filterWalletId ? t.wallet.id === filterWalletId : true;
            const matchesCategory = filterCategoryId ? t.category.id === filterCategoryId : true;
            const matchesType = filterType ? t.type === filterType : true;

            const txDate = new Date(t.transactionDate);
            if (isNaN(txDate.getTime())) return false;
            
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
            if (t.type === 'INCOME') {
                groups[dateStr].totalAmount += t.amount;
            } else {
                groups[dateStr].totalAmount -= t.amount;
            }
        });

        let sectionData = Object.keys(groups)
            .map(date => ({
                title: getRelativeDate(date),
                realDate: date,
                totalAmount: groups[date].totalAmount,
                data: groups[date].data.sort((a, b) => {
                    if (sortOrder === 'highest') return b.amount - a.amount;
                    if (sortOrder === 'lowest') return a.amount - b.amount;
                    const timeA = new Date(a.transactionDate).getTime();
                    const timeB = new Date(b.transactionDate).getTime();
                    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
                })
            }));

        sectionData.sort((a, b) => {
            const timeA = new Date(a.realDate).getTime();
            const timeB = new Date(b.realDate).getTime();
            return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
        });

        return sectionData;

    }, [transactions, searchQuery, filterWalletId, filterCategoryId, sortOrder, filterStartDate, filterEndDate]);

    const handleDelete = async (id: number) => {
        toast.confirm(
            'Xóa giao dịch này?',
            'Xóa rồi không hoàn tác được đâu nha!',
            async () => {
                try {
                    const response = await TransactionService.deleteTransaction(id);
                    toast.success('Xóa rồi! 👋', response.message || 'Giao dịch đã được xóa.');
                    fetchInitialData();
                } catch (error: any) {
                    toast.error('Xóa thất bại!', error.message || 'Không thể xóa giao dịch.');
                }
            },
            'Xóa thôi',
            'Thôi giữ lại'
        );
    };

    const renderRightActions = (dragX: Animated.AnimatedInterpolation<number>, id: number) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(id)} activeOpacity={0.8}>
                <Animated.View style={[styles.deleteTextContainer, { transform: [{ scale: trans }] }]}>
                    <Ionicons name="trash-outline" size={22} color="#FFF" />
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
                    activeOpacity={0.6}
                    onPress={() => {
                        setSelectedTransaction(item);
                        setShowDetailModal(true);
                    }}
                >
                    <View style={[styles.txIcon, { backgroundColor: (item.category.color || '#F3F4F6') + '15' }]}>
                        <Ionicons name={item.category.icon as any} size={22} color={item.category.color || '#6B7280'} />
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
            <View style={[styles.dailyTotalPill, { 
                backgroundColor: section.totalAmount >= 0 ? '#E6F4EA' : '#FCE8E6',
                borderColor: section.totalAmount >= 0 ? '#A3E635' : '#FCA5A5'
            }]}>
                <Text style={[styles.dailyTotalText, { color: section.totalAmount >= 0 ? '#137333' : '#C5221F' }]}>
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
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIcon} onPress={() => router.back()} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Giao dịch của tôi</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Redesigned Search Panel */}
            <View style={styles.searchRow}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm danh mục, ghi chú..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortModal(true)} activeOpacity={0.7}>
                    <Ionicons name="swap-vertical" size={20} color="#6366F1" />
                </TouchableOpacity>
            </View>

            {/* Filter Badges Scroll List */}
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
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.filterPillText, !isFiltered && !filterType ? styles.filterPillTextActive : null]}>Tất cả</Text>
                    </TouchableOpacity>

                    {filterType && (
                        <View style={[styles.filterPill, styles.filterPillActiveOutline]}>
                            <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                                onPress={() => setFilterType(filterType === 'INCOME' ? 'EXPENSE' : 'INCOME')}
                            >
                                <Ionicons 
                                    name={filterType === 'INCOME' ? "add-circle" : "remove-circle"} 
                                    size={14} 
                                    color="#6366F1" 
                                    style={{ marginRight: 4 }} 
                                />
                                <Text style={[styles.filterPillText, styles.filterPillTextActiveOutline]}>
                                    {filterType === 'INCOME' ? 'Thu nhập' : 'Chi tiêu'}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => setFilterType(null)}
                            >
                                <Ionicons name="close-circle" size={14} color="#6366F1" />
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={[styles.filterPill, (filterStartDate || filterEndDate) ? styles.filterPillActiveOutline : null]}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowDateRangeModal(true)}
                        >
                            <Ionicons name="calendar-outline" size={14} color={(filterStartDate || filterEndDate) ? "#6366F1" : "#4B5563"} style={{ marginRight: 4 }} />
                            <Text style={[styles.filterPillText, (filterStartDate || filterEndDate) ? styles.filterPillTextActiveOutline : null]}>
                                {formatDateRange(filterStartDate, filterEndDate)}
                            </Text>
                        </TouchableOpacity>
                        {(filterStartDate || filterEndDate) && (
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => { setFilterStartDate(null); setFilterEndDate(null); }}
                            >
                                <Ionicons name="close-circle" size={14} color="#6366F1" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.filterPill, filterCategoryId ? styles.filterPillActiveOutline : null]}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowCategoryModal(true)}
                        >
                            <Ionicons name="grid-outline" size={14} color={filterCategoryId ? "#6366F1" : "#4B5563"} style={{ marginRight: 4 }} />
                            <Text style={[styles.filterPillText, filterCategoryId ? styles.filterPillTextActiveOutline : null]}>
                                {selectedCategory ? selectedCategory.name : 'Danh mục'}
                            </Text>
                        </TouchableOpacity>
                        {filterCategoryId && (
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => setFilterCategoryId(null)}
                            >
                                <Ionicons name="close-circle" size={14} color="#6366F1" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.filterPill, filterWalletId ? styles.filterPillActiveOutline : null]}>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => setShowWalletModal(true)}
                        >
                            <Ionicons name="wallet-outline" size={14} color={filterWalletId ? "#6366F1" : "#4B5563"} style={{ marginRight: 4 }} />
                            <Text style={[styles.filterPillText, filterWalletId ? styles.filterPillTextActiveOutline : null]}>
                                {selectedWallet ? selectedWallet.name : 'Ví tiền'}
                            </Text>
                        </TouchableOpacity>
                        {filterWalletId && (
                            <TouchableOpacity
                                style={styles.clearFilterBtn}
                                onPress={() => setFilterWalletId(null)}
                            >
                                <Ionicons name="close-circle" size={14} color="#6366F1" />
                            </TouchableOpacity>
                        )}
                    </View>
                </ScrollView>
            </View>

            {/* List Grouped by Date */}
            <SectionList
                sections={groupedTransactions}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                contentContainerStyle={styles.listContainer}
                stickySectionHeadersEnabled={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={54} color="#D1D5DB" />
                        <Text style={styles.emptyText}>Chưa có giao dịch phù hợp rồi bạn ơi.</Text>
                    </View>
                }
                ItemSeparatorComponent={() => <View style={styles.divider} />}
            />

            {/* Slide up Modal for Category selection */}
            <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Lọc theo hạng mục</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
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
                                        <View key={pageIndex} style={{ width: windowWidth, paddingHorizontal: 20 }}>
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
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={[
                                                                    styles.gridIconBox, 
                                                                    { backgroundColor: (cat?.color || '#6366F1') + '15' },
                                                                    isSelected && { borderWidth: 2, borderColor: cat?.color }
                                                                ]}>
                                                                    <Ionicons name={cat?.icon as any} size={24} color={cat?.color} />
                                                                    {isSelected && (
                                                                        <View style={[styles.checkBadge, { backgroundColor: cat?.color }]}>
                                                                            <Ionicons name="checkmark" size={10} color="#fff" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[styles.gridItemText, isSelected && { color: cat?.color, fontWeight: '700' }]} numberOfLines={1}>{cat?.name}</Text>
                                                            </TouchableOpacity>
                                                        );
                                                    } else {
                                                        const isSelected = filterCategoryId === null;
                                                        return (
                                                            <TouchableOpacity
                                                                key="all-filter"
                                                                style={styles.gridItem}
                                                                onPress={() => { setFilterCategoryId(null); setShowCategoryModal(false); }}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={[
                                                                    styles.gridIconBox, 
                                                                    { backgroundColor: '#F3F4F6' },
                                                                    isSelected && { borderWidth: 2, borderColor: '#6B7280' }
                                                                ]}>
                                                                    <Ionicons name="layers" size={24} color="#6B7280" />
                                                                    {isSelected && (
                                                                        <View style={[styles.checkBadge, { backgroundColor: '#6B7280' }]}>
                                                                            <Ionicons name="checkmark" size={10} color="#fff" />
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

            {/* Slide up Modal for Wallet selection */}
            <Modal visible={showWalletModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Lọc theo ví tiền</Text>
                            <TouchableOpacity onPress={() => setShowWalletModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity
                                style={styles.listRow}
                                onPress={() => { setFilterWalletId(null); setShowWalletModal(false); }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.iconBox, { backgroundColor: '#F3F4F6' }]}>
                                    <Ionicons name="layers" size={20} color="#6B7280" />
                                </View>
                                <View style={styles.walletInfo}>
                                    <Text style={styles.walletName}>Tất cả ví của tôi</Text>
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
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                                        <Ionicons name="wallet" size={20} color="#6366F1" />
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

            {/* Date Range Selector */}
            <CustomDatePicker
                visible={showDateRangeModal}
                mode="range"
                initialDate={filterStartDate || new Date()}
                initialEndDate={filterEndDate || new Date()}
                onClose={() => setShowDateRangeModal(false)}
                onSelectRange={(start, end) => {
                    if (start > end) {
                        toast.error('Ngày sai rồi!', 'Ngày bắt đầu không được sau ngày kết thúc nha.');
                        return;
                    }
                    setFilterStartDate(start);
                    setFilterEndDate(end);
                    setShowDateRangeModal(false);
                }}
            />

            {/* Sorting Modal */}
            <Modal visible={showSortModal} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '45%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Sắp xếp giao dịch</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('newest'); setShowSortModal(false); }} activeOpacity={0.7}>
                                <Text style={[styles.walletName, sortOrder === 'newest' ? { color: '#6366F1', fontWeight: '800' } : null]}>Mới nhất</Text>
                                {sortOrder === 'newest' && <Ionicons name="checkmark" size={18} color="#6366F1" />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('oldest'); setShowSortModal(false); }} activeOpacity={0.7}>
                                <Text style={[styles.walletName, sortOrder === 'oldest' ? { color: '#6366F1', fontWeight: '800' } : null]}>Cũ nhất</Text>
                                {sortOrder === 'oldest' && <Ionicons name="checkmark" size={18} color="#6366F1" />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('highest'); setShowSortModal(false); }} activeOpacity={0.7}>
                                <Text style={[styles.walletName, sortOrder === 'highest' ? { color: '#6366F1', fontWeight: '800' } : null]}>Số tiền lớn nhất</Text>
                                {sortOrder === 'highest' && <Ionicons name="checkmark" size={18} color="#6366F1" />}
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.listRow} onPress={() => { setSortOrder('lowest'); setShowSortModal(false); }} activeOpacity={0.7}>
                                <Text style={[styles.walletName, sortOrder === 'lowest' ? { color: '#6366F1', fontWeight: '800' } : null]}>Số tiền nhỏ nhất</Text>
                                {sortOrder === 'lowest' && <Ionicons name="checkmark" size={18} color="#6366F1" />}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Transaction Detail Overlay */}
            <Modal visible={showDetailModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.detailModalTitle}>Chi tiết giao dịch</Text>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        {selectedTransaction && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.detailHeader}>
                                    <View style={[styles.detailIcon, { backgroundColor: selectedTransaction.category.color + '20' }]}>
                                        <Ionicons name={selectedTransaction.category.icon as any} size={36} color={selectedTransaction.category.color} />
                                    </View>
                                    <Text style={styles.detailCategoryName}>{selectedTransaction.category.name}</Text>
                                    <Text style={[styles.detailAmount, { color: selectedTransaction.type === 'INCOME' ? '#10B981' : '#111827' }]}>
                                        {selectedTransaction.type === 'INCOME' ? '+' : '-'}{formatVND(selectedTransaction.amount)} đ
                                    </Text>
                                </View>

                                <View style={styles.detailSection}>
                                    <View style={styles.detailRow}>
                                        <View style={styles.detailRowIconBg}>
                                            <Ionicons name="time-outline" size={16} color="#6B7280" />
                                        </View>
                                        <View>
                                            <Text style={styles.detailLabel}>Thời gian giao dịch</Text>
                                            <Text style={styles.detailValue}>
                                                {formatDateTime(selectedTransaction.transactionDate)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailRow}>
                                        <View style={styles.detailRowIconBg}>
                                            <Ionicons name="wallet-outline" size={16} color="#6B7280" />
                                        </View>
                                        <View>
                                            <Text style={styles.detailLabel}>Tài khoản thanh toán</Text>
                                            <Text style={styles.detailValue}>{selectedTransaction.wallet.name}</Text>
                                        </View>
                                    </View>

                                    {selectedTransaction.description && (
                                        <View style={styles.detailRow}>
                                            <View style={styles.detailRowIconBg}>
                                                <Ionicons name="document-text-outline" size={16} color="#6B7280" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.detailLabel}>Ghi chú chi tiết</Text>
                                                <Text style={styles.detailValue}>{selectedTransaction.description}</Text>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.detailRow}>
                                        <View style={styles.detailRowIconBg}>
                                            <Ionicons name="swap-horizontal-outline" size={16} color="#6B7280" />
                                        </View>
                                        <View>
                                            <Text style={styles.detailLabel}>Loại hoạt động</Text>
                                            <Text style={[styles.detailValue, { color: selectedTransaction.type === 'INCOME' ? '#10B981' : '#EF4444', fontWeight: '800' }]}>
                                                {selectedTransaction.type === 'INCOME' ? 'Khoản thu vào' : 'Khoản chi ra'}
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
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
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
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: '#FFFFFF' },
    headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

    searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 14, gap: 12 },
    searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 14, paddingHorizontal: 14, height: 44 },
    searchIcon: { marginRight: 8 },
    searchInput: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
    sortBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },

    filterPillsContainer: { marginBottom: 16 },
    filterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
    filterPillActive: { backgroundColor: '#6366F1' },
    filterPillText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
    filterPillTextActive: { color: '#FFFFFF' },
    filterPillActiveOutline: { backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#C7D2FE' },
    filterPillTextActiveOutline: { color: '#6366F1' },
    clearFilterBtn: { marginLeft: 6, padding: 2 },

    listContainer: { paddingBottom: 60 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, backgroundColor: '#FFFFFF' },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
    dailyTotalPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
    dailyTotalText: { fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] },

    swipeableContainer: { paddingHorizontal: 20, marginBottom: 10 },
    txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    txIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    txInfo: { flex: 1, marginLeft: 12, marginRight: 12 },
    txName: { fontSize: 14, fontWeight: '700', color: '#1F2937' },
    txDesc: { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
    txAmountContainer: { alignItems: 'flex-end' },
    txAmount: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
    divider: { height: 0 },

    emptyContainer: { padding: 40, alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginTop: 12 },

    deleteAction: {
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: '100%',
        borderRadius: 16,
        marginLeft: 10,
    },
    deleteTextContainer: { justifyContent: 'center', alignItems: 'center' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '65%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },

    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'flex-start' },
    gridItem: { width: (width - 76) / 4, alignItems: 'center', marginBottom: 14 },
    gridIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    gridItemText: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 6, width: '100%', textAlign: 'center' },
    checkBadge: { position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

    paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10, gap: 6, paddingBottom: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
    dotActive: { backgroundColor: '#6366F1', width: 12 },

    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', justifyContent: 'space-between' },
    iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    walletInfo: { flex: 1, marginLeft: 12 },
    walletName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    walletBal: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2, fontVariant: ['tabular-nums'] },

    detailModalTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
    detailHeader: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    detailIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    detailCategoryName: { fontSize: 15, fontWeight: '700', color: '#111827' },
    detailAmount: { fontSize: 26, fontWeight: '800', marginTop: 6, fontVariant: ['tabular-nums'] },

    detailSection: { paddingVertical: 20, gap: 16 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    detailRowIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    detailValue: { fontSize: 13, color: '#1F2937', fontWeight: '700', marginTop: 2 },
    detailDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FDF2F2', paddingVertical: 14, borderRadius: 14, marginTop: 16, borderWidth: 1, borderColor: '#FDE8E8' },
    detailDeleteBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '700' }
});
