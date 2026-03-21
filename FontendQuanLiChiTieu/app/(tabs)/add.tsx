import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Alert, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';
import { CategoryService, CategoryResponse } from '../../src/services/category.service';
import { TransactionService, TransactionRequest } from '../../src/services/transaction.service';
import { BudgetService, BudgetResponse } from '../../src/services/budget.service';
import { formatDate } from '../../src/utils/date';
import { CustomDatePicker } from '../../src/components/common/CustomDatePicker';

type TransactionType = 'EXPENSE' | 'INCOME';

export default function AddTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Đọc tham số initialType truyền từ màn hình Home sang (nếu có)
    const initialType = (params.initialType as TransactionType) || 'EXPENSE';

    const [type, setType] = useState<TransactionType>(initialType);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [walletId, setWalletId] = useState<number | null>(null);
    const [date, setDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);

    // Pickers State
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // State for budgets to check limit
    const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
    const { width: windowWidth } = useWindowDimensions();

    // Category Pagination State
    const [currentCategoryPage, setCurrentCategoryPage] = useState(0);

    useFocusEffect(
        useCallback(() => {
            if (params.initialType) {
                const targetType = params.initialType as TransactionType;
                setType(targetType);
                fetchInitialData(targetType);
                // Clear the param after consuming it to prevent jump-back on subsequent refocus
                router.setParams({ initialType: undefined });
            } else {
                fetchInitialData(type);
            }
        }, [params.initialType, type, router])
    );

    // Cập nhật lại state Type khi tham số param thay đổi (VD click từ ví sang)
    useEffect(() => {
        if (params.initialType) {
            setType(params.initialType as TransactionType);
        }
    }, [params.initialType]);

    // Re-fetch category when type changes
    useEffect(() => {
        setCategories([]); // Clear stale categories immediately ("vướng" fix)
        setCategoryId(null); // Reset category when switching type
        setCurrentCategoryPage(0); // Reset pagination
        fetchCategories(type); // Fetch for the new type
    }, [type]);

    const fetchInitialData = async (targetType?: TransactionType) => {
        try {
            setLoading(true);
            const currentType = targetType || type;
            const [wRes, bRes] = await Promise.all([
                WalletService.getMyWallets(),
                BudgetService.getMyBudgets()
            ]);
            setWallets(wRes);
            setBudgets(bRes);

            await fetchCategories(currentType);

            if (wRes.length > 0 && !walletId) setWalletId(wRes[0].id); // Auto select only if none selected
        } catch (error) {
            console.log("Error fetching initial data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async (currentType: TransactionType) => {
        try {
            setLoading(true); // Show loading for category section
            const cRes = await CategoryService.getMyCategories(currentType);
            setCategories(cRes);
        } catch (error) {
            console.log("Error fetching categories", error);
        } finally {
            setLoading(false);
        }
    };

    // Budget warning logic
    const getBudgetInfo = () => {
        if (type !== 'EXPENSE' || !categoryId || !amount) return null;

        const selectedMonth = date.getMonth() + 1;
        const selectedYear = date.getFullYear();

        // Find budget for this category or "All" category (categoryId null in DB sometimes)
        // Matching current month/year
        const budget = budgets.find(b =>
            (b.categoryId === categoryId || b.categoryId === null) &&
            b.periodValue === selectedMonth &&
            b.year === selectedYear &&
            b.isActive
        );

        if (!budget) return null;

        const newTotal = (budget.spentAmount || 0) + Number(amount);
        const isExceeded = newTotal > budget.amount;
        const isNearLimit = newTotal > (budget.amount * (budget.alertThreshold / 100));

        return {
            isExceeded,
            isNearLimit,
            remaining: budget.amount - (budget.spentAmount || 0),
            limit: budget.amount
        };
    };

    const budgetInfo = getBudgetInfo();


    const handleSave = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
            return;
        }
        if (!categoryId) {
            Alert.alert("Lỗi", "Vui lòng chọn danh mục");
            return;
        }
        if (!walletId) {
            Alert.alert("Lỗi", "Vui lòng chọn ví");
            return;
        }

        if (budgetInfo?.isExceeded) {
            const proceed = await new Promise(resolve => {
                Alert.alert(
                    "Cảnh báo vượt ngân sách",
                    `Giao dịch này sẽ khiến bạn vượt quá ngân sách cho phép (${new Intl.NumberFormat('vi-VN').format(budgetInfo.limit)} đ). Bạn vẫn muốn lưu?`,
                    [
                        { text: "Hủy", onPress: () => resolve(false), style: "cancel" },
                        { text: "Vẫn lưu", onPress: () => resolve(true) }
                    ]
                );
            });
            if (!proceed) return;
        }

        try {
            setIsSaving(true);
            const req: TransactionRequest = {
                amount: Number(amount),
                type,
                categoryId,
                walletId,
                transactionDate: date.toISOString(),
                description
            };
            await TransactionService.createTransaction(req);
            Alert.alert("Thành công", "Đã thêm giao dịch", [
                {
                    text: "OK", onPress: () => {
                        // Reset form and go home
                        setAmount('');
                        setDescription('');
                        router.push('/');
                    }
                }
            ]);
        } catch (err: any) {
            console.log(err);
            Alert.alert("Lỗi", err.response?.data?.message || err.message || "Không thể thêm giao dịch lúc này");
        } finally {
            setIsSaving(false);
        }
    };

    const selectedWallet = wallets.find(w => w.id === walletId);

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thêm giao dịch</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Type Switcher */}
                <View style={styles.segmentedControl}>
                    <TouchableOpacity
                        style={[styles.segmentBtn, type === 'EXPENSE' && styles.segmentBtnActive]}
                        onPress={() => setType('EXPENSE')}
                    >
                        <Text style={[styles.segmentText, type === 'EXPENSE' && styles.segmentTextActive]}>Chi tiêu</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.segmentBtn, type === 'INCOME' && styles.segmentBtnActive]}
                        onPress={() => setType('INCOME')}
                    >
                        <Text style={[styles.segmentText, type === 'INCOME' && styles.segmentTextActive]}>Thu nhập</Text>
                    </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>Số tiền</Text>
                    <View style={styles.amountRow}>
                        <View style={styles.amountInputWrapper}>
                            <TextInput
                                style={[
                                    styles.amountInput,
                                    { color: isAmountFocused || amount ? '#111827' : '#D1D5DB' }
                                ]}
                                placeholder="0"
                                placeholderTextColor="#D1D5DB"
                                keyboardType="numeric"
                                value={amount ? new Intl.NumberFormat('en-US').format(Number(amount)) : ''}
                                onFocus={() => setIsAmountFocused(true)}
                                onBlur={() => setIsAmountFocused(false)}
                                onChangeText={(text) => {
                                    const numeric = text.replace(/[^0-9]/g, '');
                                    setAmount(numeric);
                                }}
                            />
                            <Text style={styles.currencySymbol}>đ</Text>
                        </View>
                    </View>
                    {budgetInfo && (
                        <View style={[
                            styles.budgetWarning,
                            budgetInfo.isExceeded ? styles.budgetExceeded : styles.budgetNearLimit
                        ]}>
                            <Ionicons
                                name={budgetInfo.isExceeded ? "alert-circle" : "warning"}
                                size={16}
                                color={budgetInfo.isExceeded ? "#EF4444" : "#F59E0B"}
                            />
                            <Text style={[
                                styles.budgetWarningText,
                                { color: budgetInfo.isExceeded ? "#EF4444" : "#F59E0B" }
                            ]}>
                                {budgetInfo.isExceeded
                                    ? `Vượt ngân sách! Còn lại: ${new Intl.NumberFormat('vi-VN').format(budgetInfo.remaining)} đ`
                                    : `Sắp chạm hạn mức ngân sách (${new Intl.NumberFormat('vi-VN').format(budgetInfo.remaining)} đ còn lại)`}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Categories Pagination */}
                <Text style={styles.sectionTitle}>Danh mục</Text>
                {loading ? (
                    <ActivityIndicator size="small" color="#4F46E5" style={{ marginVertical: 20 }} />
                ) : (
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
                            style={styles.categoriesPager}
                        >
                            {/* Each page has 8 items max */}
                            {(() => {
                                const items = [
                                    ...categories.map(cat => ({ type: 'category' as const, data: cat })),
                                    { type: 'add' as const, data: null }
                                ];
                                const pages: any[][] = [];
                                for (let i = 0; i < items.length; i += 8) {
                                    pages.push(items.slice(i, i + 8));
                                }

                                return pages.map((page, pageIndex) => (
                                    <View key={pageIndex} style={[styles.categoryPage, { width: windowWidth - 40 }]}>
                                        <View style={styles.categoriesGrid}>
                                            {page.map((item, idx) => {
                                                if (item.type === 'category') {
                                                    const cat = item.data;
                                                    const isSelected = categoryId === cat?.id;
                                                    return (
                                                        <TouchableOpacity
                                                            key={cat?.id}
                                                            style={styles.categoryGridItem}
                                                            onPress={() => setCategoryId(cat?.id || null)}
                                                        >
                                                            <View style={[
                                                                styles.catIconWrapper,
                                                                { backgroundColor: (cat?.color || '#000') + (isSelected ? '40' : '15') },
                                                                isSelected && { borderWidth: 2.5, borderColor: cat?.color }
                                                            ]}>
                                                                <Ionicons name={cat?.icon as any} size={26} color={cat?.color} />
                                                                {isSelected && (
                                                                    <View style={[styles.checkBadge, { backgroundColor: cat?.color }]}>
                                                                        <Ionicons name="checkmark" size={12} color="#fff" />
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text style={[styles.catName, isSelected && { color: cat?.color, fontWeight: '800' }]} numberOfLines={1}>
                                                                {cat?.name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                } else {
                                                    return (
                                                        <TouchableOpacity
                                                            key="add-btn"
                                                            style={styles.categoryGridItem}
                                                            onPress={() => router.push(`/category-form?type=${type}` as any)}
                                                        >
                                                            <View style={[styles.catIconWrapper, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' }]}>
                                                                <Ionicons name="add" size={26} color="#6B7280" />
                                                            </View>
                                                            <Text style={styles.catName} numberOfLines={1}>
                                                                Thêm mới
                                                            </Text>
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
                        {categories.length + 1 > 8 && (
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
                )}

                {/* Cards Section */}
                <View style={styles.cardsSection}>
                    {/* Date Card */}
                    <TouchableOpacity style={styles.card} onPress={() => setShowDatePicker(true)}>
                        <View style={styles.cardIconBox}>
                            <Ionicons name="calendar" size={22} color="#3B82F6" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Ngày thực hiện</Text>
                            <Text style={styles.cardValue}>{formatDate(date)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                    </TouchableOpacity>

                    <CustomDatePicker
                        visible={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        initialDate={date}
                        onSelect={(selectedDate) => {
                            setDate(selectedDate);
                        }}
                    />

                    {/* Note Card */}
                    <View style={styles.card}>
                        <View style={[styles.cardIconBox, { backgroundColor: '#E0F2FE' }]}>
                            <Ionicons name="pencil" size={22} color="#0284C7" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Ghi chú</Text>
                            <TextInput
                                style={styles.cardTextInput}
                                placeholder="Viết ghi chú..."
                                placeholderTextColor="#9CA3AF"
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    {/* Wallet Card (Replaces Image Attachment visually) */}
                    <TouchableOpacity style={styles.card} onPress={() => setShowWalletModal(true)}>
                        <View style={[styles.cardIconBox, { backgroundColor: '#F3E8FF' }]}>
                            <Ionicons name="wallet" size={22} color="#9333EA" />
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardLabel}>Ví tiền</Text>
                            <Text style={[styles.cardValue, !selectedWallet && { color: '#9CA3AF' }]}>
                                {selectedWallet ? selectedWallet.name : 'Chọn ví'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>

                </View>

            </ScrollView>

            <View style={styles.bottomFooter}>
                <TouchableOpacity
                    style={[styles.submitBtn, isSaving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={22} color="#ffffff" style={{ marginRight: 8 }} />
                            <Text style={styles.submitBtnText}>Lưu giao dịch</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Wallet Selection Modal */}
            <Modal visible={showWalletModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Ví</Text>
                            <TouchableOpacity onPress={() => setShowWalletModal(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            {wallets.map(w => (
                                <TouchableOpacity
                                    key={w.id}
                                    style={styles.listRow}
                                    onPress={() => {
                                        setWalletId(w.id);
                                        setShowWalletModal(false);
                                    }}
                                >
                                    <View style={[styles.cardIconBox, { backgroundColor: '#EEF2FF' }]}>
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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 10,
        backgroundColor: '#FAFAFA',
    },
    headerIconBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },

    scrollContent: { flex: 1 },
    scrollContentContainer: { paddingHorizontal: 20, paddingBottom: 40 },

    // Segmented Control
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#E5E7EB', // matching the light gray in mockup
        borderRadius: 24,
        padding: 4,
        marginTop: 10,
        marginBottom: 30,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 20,
    },
    segmentBtnActive: {
        backgroundColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
    segmentTextActive: { color: '#111827' },

    // Amount Section
    amountSection: { alignItems: 'center', marginBottom: 30 },
    amountLabel: { fontSize: 14, color: '#6B7280', marginBottom: 5 },
    amountInputWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    amountInput: {
        fontSize: 56,
        fontWeight: '700',
        textAlign: 'center',
        minWidth: 80, // give it some width when empty
    },
    currencySymbol: { fontSize: 32, fontWeight: '700', color: '#9CA3AF', marginLeft: 8, marginTop: 10 },

    // Categories
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
    categoriesPager: { marginHorizontal: -20 },
    categoryPage: { paddingHorizontal: 20 }, 
    categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
    categoryGridItem: { width: '25%', alignItems: 'center', marginBottom: 20 },
    catIconWrapper: {
        width: 60, height: 60,
        borderRadius: 30,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 8,
    },
    catName: { fontSize: 12, color: '#4B5563', textAlign: 'center' },
    checkBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    paginationDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -10,
        marginBottom: 20,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    dotActive: {
        backgroundColor: '#4F46E5',
        width: 20, // stretch the active dot
    },

    // Cards
    cardsSection: { marginTop: 10 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 1,
    },
    cardIconBox: {
        width: 44, height: 44,
        borderRadius: 12,
        backgroundColor: '#E0F2FE', // default blueish
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    cardContent: { flex: 1 },
    cardLabel: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
    cardValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
    cardTextInput: { fontSize: 16, fontWeight: '500', color: '#111827', padding: 0 },

    // Bottom Button
    bottomFooter: { padding: 20, paddingBottom: 30, backgroundColor: '#FAFAFA' },
    submitBtn: {
        backgroundColor: '#0EA5E9', // vibrant blue matching mockup
        flexDirection: 'row',
        justifyContent: 'center', alignItems: 'center',
        paddingVertical: 18,
        borderRadius: 30,
        shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
    },
    submitBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

    // Modals (reused for wallet)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    walletInfo: { flex: 1 },
    walletName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    walletBal: { fontSize: 14, color: '#6B7280', marginTop: 4 },

    // Budget Warning Styles
    budgetWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginTop: 10,
    },
    budgetNearLimit: {
        backgroundColor: '#FFFBEB',
    },
    budgetExceeded: {
        backgroundColor: '#FEF2F2',
    },
    budgetWarningText: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
});
