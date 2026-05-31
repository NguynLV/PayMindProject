import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Platform, useWindowDimensions, Image, StatusBar, KeyboardAvoidingView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WalletService, WalletResponse } from '../../src/services/wallet.service';
import { CategoryService, CategoryResponse } from '../../src/services/category.service';
import { TransactionService, TransactionRequest } from '../../src/services/transaction.service';
import { BudgetService, BudgetResponse } from '../../src/services/budget.service';
import { formatDate } from '../../src/utils/date';
import { CustomDatePicker } from '../../src/components/common/CustomDatePicker';
import { useToast } from '../../src/components/common/Toast';
import * as ImagePicker from 'expo-image-picker';
import UserService, { UserProfile } from '../../src/services/user.service';
import { AiService } from '../../src/services/ai.service';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AiLimitService } from '../../src/utils/aiLimit';

const { width, height } = Dimensions.get('window');
type TransactionType = 'EXPENSE' | 'INCOME';

const MOODS = [
  { emoji: '🫠', label: 'Rất tệ', value: 'very_bad' },
  { emoji: '🤡', label: 'Tệ', value: 'bad' },
  { emoji: '🗿', label: 'Bình thường', value: 'neutral' },
  { emoji: '😎', label: 'Tốt', value: 'good' },
  { emoji: '💅', label: 'Rất tốt', value: 'very_good' },
];

const getMoodTheme = (moodValue: string | null) => {
    switch (moodValue) {
        case 'very_good':
            return {
                bg: 'rgba(236, 72, 153, 0.08)',
                border: 'rgba(236, 72, 153, 0.2)',
                textColor: '#EC4899',
                emoji: '💅'
            };
        case 'good':
            return {
                bg: 'rgba(16, 185, 129, 0.08)',
                border: 'rgba(16, 185, 129, 0.2)',
                textColor: '#10B981',
                emoji: '😎'
            };
        case 'neutral':
            return {
                bg: 'rgba(156, 163, 175, 0.08)',
                border: 'rgba(156, 163, 175, 0.2)',
                textColor: '#6B7280',
                emoji: '🗿'
            };
        case 'bad':
            return {
                bg: 'rgba(245, 158, 11, 0.08)',
                border: 'rgba(245, 158, 11, 0.2)',
                textColor: '#D97706',
                emoji: '🤡'
            };
        case 'very_bad':
            return {
                bg: 'rgba(239, 68, 68, 0.08)',
                border: 'rgba(239, 68, 68, 0.2)',
                textColor: '#EF4444',
                emoji: '🫠'
            };
        default:
            return {
                bg: '#F3F4F6',
                border: '#E5E7EB',
                textColor: '#4B5563',
                emoji: '🎭'
            };
    }
};

export default function AddTransactionScreen() {
    const router = useRouter();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    const initialType = (params.initialType as TransactionType) || 'EXPENSE';

    const [type, setType] = useState<TransactionType>(initialType);
    const [amount, setAmount] = useState('');
    const [categoryId, setCategoryId] = useState<number | null>(null);
    const [walletId, setWalletId] = useState<number | null>(null);
    const [date, setDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [isAmountFocused, setIsAmountFocused] = useState(false);

    const [showDatePicker, setShowDatePicker] = useState(false);

    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);

    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const [budgets, setBudgets] = useState<BudgetResponse[]>([]);
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();

    const isSmallScreen = windowHeight < 750;
    const isMediumScreen = windowHeight >= 750 && windowHeight < 850;
    const imageContainerHeight = isSmallScreen ? 200 : isMediumScreen ? 230 : 260;
    const keyHeight = isSmallScreen ? 44 : isMediumScreen ? 48 : 52;
    const rowGap = isSmallScreen ? 6 : 8;

    const [currentCategoryPage, setCurrentCategoryPage] = useState(0);

    const [expression, setExpression] = useState('0');
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [mood, setMood] = useState<string | null>(null);
    const [showMoodModal, setShowMoodModal] = useState(false);
    
    const [inputMode, setInputMode] = useState<'camera_capture' | 'calculator' | 'manual'>('camera_capture');
    const cameraRef = useRef<CameraView>(null);
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<'back' | 'front'>('back');
    const [flash, setFlash] = useState<'off' | 'on'>('off');
    const [zoom, setZoom] = useState(0);

    const evaluateExpression = (expr: string): number => {
        try {
            let cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
            cleanExpr = cleanExpr.replace(/[^0-9+\-*/.]/g, '');
            if (/[+\-*/]$/.test(cleanExpr)) {
                cleanExpr = cleanExpr.slice(0, -1);
            }
            if (!cleanExpr) return 0;
            const result = new Function(`return ${cleanExpr}`)();
            return isNaN(result) || result === Infinity || result === -Infinity ? 0 : Math.round(result);
        } catch {
            return 0;
        }
    };

    const formatExpression = (expr: string) => {
        if (!expr) return '0';
        return expr.replace(/(\d+)/g, (match) => {
            return new Intl.NumberFormat('vi-VN').format(Number(match));
        }).replace(/\+/g, ' + ')
          .replace(/-/g, ' - ')
          .replace(/\*/g, ' × ')
          .replace(/\//g, ' ÷ ');
    };

    useEffect(() => {
        const evalVal = evaluateExpression(expression);
        setAmount(String(evalVal));
    }, [expression]);

    useFocusEffect(
        useCallback(() => {
            setAmount('');
            setExpression('0');
            setDescription('');
            setImageUri(null);
            setMood(null);
            
            setInputMode('camera_capture');

            if (params.date) {
                setDate(new Date(params.date as string));
                router.setParams({ date: undefined });
            } else {
                setDate(new Date());
            }

            if (params.initialType) {
                const targetType = params.initialType as TransactionType;
                setType(targetType);
                fetchInitialData(targetType);
                router.setParams({ initialType: undefined });
            } else {
                fetchInitialData(type);
            }
        }, [params.initialType, params.date, type, router])
    );

    useEffect(() => {
        if (params.initialType) {
            setType(params.initialType as TransactionType);
        }
    }, [params.initialType]);

    useEffect(() => {
        setCategories([]);
        setCategoryId(null);
        setCurrentCategoryPage(0);
        fetchCategories(type);
    }, [type]);

    const fetchInitialData = async (targetType?: TransactionType) => {
        try {
            setLoading(true);
            const currentType = targetType || type;
            const [wRes, bRes, uProfile] = await Promise.all([
                WalletService.getMyWallets(),
                BudgetService.getMyBudgets(),
                UserService.getMyProfile().catch(() => null)
            ]);
            setWallets(wRes);
            setBudgets(bRes);
            if (uProfile) {
                setUser(uProfile);
                setInputMode('camera_capture');
            }

            await fetchCategories(currentType);

            if (wRes.length > 0 && !walletId) setWalletId(wRes[0].id);
        } catch (error) {
            console.log("Error fetching initial data", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async (currentType: TransactionType) => {
        try {
            setLoading(true);
            const cRes = await CategoryService.getMyCategories(currentType);
            setCategories(cRes);
        } catch (error) {
            console.log("Error fetching categories", error);
        } finally {
            setLoading(false);
        }
    };

    const getBudgetInfo = () => {
        if (type !== 'EXPENSE' || !categoryId || !amount) return null;

        const selectedMonth = date.getMonth() + 1;
        const selectedYear = date.getFullYear();

        const relevantBudgets = budgets.filter(b => {
            return b.periodValue === selectedMonth && b.year === selectedYear;
        });

        const catBudget = relevantBudgets.find(b => b.categoryId === categoryId);
        const totalBudget = relevantBudgets.find(b => !b.categoryId);

        const activeBudget = catBudget || totalBudget;
        if (!activeBudget) return null;

        const numericAmount = Number(amount);
        const remaining = activeBudget.amount - activeBudget.spentAmount;
        const isExceeded = numericAmount > remaining;
        const isNearLimit = !isExceeded && (remaining - numericAmount) / activeBudget.amount < 0.15;

        return {
            limit: activeBudget.amount,
            remaining,
            isExceeded,
            isNearLimit,
            budgetName: activeBudget.name
        };
    };

    const budgetInfo = getBudgetInfo();

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast.error('Ủa sai rồi!', 'Nhập số tiền hợp lệ nha bạn ơi.');
            return;
        }
        if (!categoryId) {
            toast.error('Chưa chọn danh mục!', 'Chọn danh mục cho giao dịch nha.');
            return;
        }
        if (!walletId) {
            toast.error('Chưa chọn ví!', 'Chọn ví để lưu giao dịch nha.');
            return;
        }

        if (imageUri && user && !user.isPremium) {
            try {
                setLoading(true);
                const txs = await TransactionService.getMyTransactions();
                const imageCount = txs.filter(t => !!t.imageUrl).length;
                if (imageCount >= 9) {
                    toast.info('Giới hạn hình ảnh! 👑', 'Tài khoản miễn phí chỉ được tải lên tối đa 9 ảnh hóa đơn. Hãy nâng cấp Premium để không giới hạn.');
                    router.push('/premium');
                    return;
                }
            } catch (err) {
                console.log("Error checking transaction image limit", err);
            } finally {
                setLoading(false);
            }
        }

        if (budgetInfo?.isExceeded) {
            toast.confirm(
                '⚠️ Vượt ngân sách rồi!',
                `Giao dịch này sẽ khiến bạn vượt hạn mức ${new Intl.NumberFormat('vi-VN').format(budgetInfo.limit)}đ. Vẫn lưu không?`,
                async () => {
                    await doSave();
                },
                'Vẫn lưu thôi',
                'Thôi hủy'
            );
            return;
        }

        await doSave();
    };

    const doSave = async () => {
        try {
            setIsSaving(true);
            let finalImageUrl = undefined;
            if (imageUri) {
                try {
                    finalImageUrl = await TransactionService.uploadImage(imageUri);
                } catch (uploadErr) {
                    console.log("Failed to upload transaction image", uploadErr);
                }
            }
            const req: TransactionRequest = {
                amount: Number(amount),
                type,
                categoryId: categoryId!,
                walletId: walletId!,
                transactionDate: date.toISOString(),
                description,
                imageUrl: finalImageUrl,
                mood: mood || undefined
            };
            await TransactionService.createTransaction(req);
            toast.success('Đã lưu giao dịch! 🎉', 'Giao dịch của bạn đã được ghi lại thành công.');
            setTimeout(() => {
                setAmount('');
                setDescription('');
                setImageUri(null);
                setMood(null);
                setInputMode('camera_capture');
                router.push('/');
            }, 1200);
        } catch (err: any) {
            console.log(err);
            toast.error('Lưu thất bại 😅', err.response?.data?.message || err.message || 'Không thể thêm giao dịch lúc này.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyPress = (key: string) => {
        if (key === 'C') {
            setExpression('0');
        } else if (key === 'backspace') {
            if (expression.length <= 1) {
                setExpression('0');
            } else {
                setExpression(expression.slice(0, -1));
            }
        } else if (key === '000') {
            if (expression === '0') return;
            const lastChar = expression.slice(-1);
            if (/[0-9]/.test(lastChar)) {
                setExpression(expression + '000');
            }
        } else if (key === '+' || key === '-' || key === '*' || key === '/') {
            const lastChar = expression.slice(-1);
            if (['+', '-', '*', '/'].includes(lastChar)) {
                setExpression(expression.slice(0, -1) + key);
            } else {
                setExpression(expression + key);
            }
        } else if (key === '.') {
            const parts = expression.split(/[+\-*/]/);
            const currentPart = parts[parts.length - 1];
            if (!currentPart.includes('.')) {
                setExpression(expression + '.');
            }
        } else if (key === 'submit') {
            handleSave();
        } else {
            if (expression === '0') {
                setExpression(key);
            } else {
                setExpression(expression + key);
            }
        }
    };

    const handlePickImage = async (useCamera: boolean) => {
        try {
            let result;
            if (useCamera) {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    toast.error('Quyền truy cập!', 'Vui lòng cho phép truy cập camera.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    quality: 0.85,
                    base64: true
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    toast.error('Quyền truy cập!', 'Vui lòng cho phép truy cập thư viện.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.85,
                    base64: true
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setImageUri(asset.uri);
                setInputMode('calculator');

                if (user?.isPremium) {
                    await runAiScan(asset.base64 || '', asset.mimeType || 'image/jpeg');
                } else {
                    toast.info('Đã đính kèm ảnh! 📸', 'Hãy nhập tay số tiền và chọn chi tiết giao dịch nhé.');
                }
            }
        } catch (err: any) {
            console.log("Error selecting image", err);
            toast.error('Thất bại', 'Không thể chọn ảnh.');
        }
    };

    const handleCapture = async () => {
        if (!permission?.granted) {
            const status = await requestPermission();
            if (!status.granted) {
                toast.error('Quyền truy cập!', 'Vui lòng cho phép truy cập camera.');
                return;
            }
        }
        try {
            const photo = await cameraRef.current?.takePictureAsync({
                quality: 0.85,
                base64: true
            });
            if (photo && photo.uri) {
                setImageUri(photo.uri);
                setInputMode('calculator');
                
                if (user?.isPremium) {
                    await runAiScan(photo.base64 || '', 'image/jpeg');
                } else {
                    toast.info('Đã đính kèm ảnh! 📸', 'Hãy nhập tay số tiền và chọn chi tiết giao dịch nhé.');
                }
            }
        } catch (err) {
            console.log("Error capturing photo", err);
            toast.error('Thất bại', 'Không thể chụp ảnh từ Camera.');
        }
    };

    const runAiScan = async (base64: string, mime: string) => {
        const isPremiumUser = !!user?.isPremium;
        const stats = await AiLimitService.getUsageStats(isPremiumUser);
        if (!stats.allowed) {
            toast.info('Đạt giới hạn AI hôm nay! 👑', 'Vui lòng nâng cấp lên Premium để tiếp tục sử dụng tính năng quét hóa đơn AI.');
            router.push('/premium');
            return;
        }

        try {
            setIsScanning(true);
            const categoryNames = categories.map(c => c.name);
            const parsed = await AiService.scanReceipt(base64, mime, categoryNames);

            // Increment daily AI usage
            await AiLimitService.incrementUsage(isPremiumUser);

            if (parsed) {
                if (parsed.amount && parsed.amount > 0) {
                    setExpression(String(parsed.amount));
                }
                if (parsed.type) {
                    setType(parsed.type);
                }
                if (parsed.description) {
                    setDescription(parsed.description);
                }
                
                if (parsed.category) {
                    const matched = categories.find(
                        c => c.name.toLowerCase() === parsed.category!.toLowerCase() &&
                        c.type === (parsed.type || type)
                    );
                    if (matched) {
                        setCategoryId(matched.id);
                    }
                }

                if (parsed.walletIntent && wallets.length > 0) {
                    if (parsed.walletIntent === 'BANK') {
                        const bw = wallets.find(w =>
                            w.name.toLowerCase().includes('ngân hàng') ||
                            w.name.toLowerCase().includes('bank') ||
                            w.name.toLowerCase().includes('thẻ')
                        );
                        if (bw) setWalletId(bw.id);
                    } else if (parsed.walletIntent === 'CASH') {
                        const cw = wallets.find(w =>
                            w.name.toLowerCase().includes('tiền mặt') ||
                            w.name.toLowerCase().includes('ví')
                        );
                        if (cw) setWalletId(cw.id);
                    }
                }

                toast.success('Quét hóa đơn xong! 🤖✨', 'AI đã tự động điền các thông tin tìm được.');
            }
        } catch (err: any) {
            console.log("Error during AI scan receipt", err);
            toast.error('Lỗi quét hóa đơn 😅', 'Không thể tự động phân tích hóa đơn lúc này.');
        } finally {
            setIsScanning(false);
        }
    };

    const selectedWallet = wallets.find(w => w.id === walletId);

    if (inputMode === 'camera_capture') {
        return (
            <View style={styles.captureContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#000000" />
                
                <View style={[styles.captureHeader, { paddingTop: insets.top, height: 56 + insets.top }]}>
                    <TouchableOpacity style={styles.captureCancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.cameraFrame}>
                    {permission?.granted ? (
                        <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} flash={flash} zoom={zoom}>
                            <View style={styles.cameraInnerTop}>
                                <TouchableOpacity style={styles.cameraInnerBtn} onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')}>
                                    <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={18} color={flash === 'on' ? '#FFB800' : '#FFF'} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cameraInnerBtn} onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}>
                                    <Ionicons name="camera-reverse-outline" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.zoomContainer}>
                                <TouchableOpacity style={[styles.zoomPill, zoom === 0 && styles.zoomPillActive]} onPress={() => setZoom(0)}>
                                    <Text style={[styles.zoomText, zoom === 0 && styles.zoomTextActive]}>1x</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.zoomPill, zoom === 0.5 && styles.zoomPillActive]} onPress={() => setZoom(0.5)}>
                                    <Text style={[styles.zoomText, zoom === 0.5 && styles.zoomTextActive]}>2x</Text>
                                </TouchableOpacity>
                            </View>
                        </CameraView>
                    ) : (
                        <View style={styles.cameraPermContainer}>
                            <Ionicons name="camera-outline" size={44} color="rgba(255,255,255,0.4)" />
                            <Text style={styles.cameraPermText}>Cần quyền truy cập Camera</Text>
                            <TouchableOpacity style={styles.cameraPermBtn} onPress={requestPermission}>
                                <Text style={styles.cameraPermBtnText}>Cấp quyền</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.captureBottomControls}>
                    <TouchableOpacity style={styles.captureOuterCircle} onPress={handleCapture} activeOpacity={0.85}>
                        <View style={styles.captureInnerCircle} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.libraryCapsule} onPress={() => handlePickImage(false)}>
                        <Ionicons name="images-outline" size={15} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.libraryCapsuleText}>Chọn từ ảnh</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipBtn} onPress={() => setInputMode('manual')}>
                        <Text style={styles.skipBtnText}>Nhập tay</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (inputMode === 'manual') {
        return (
            <View style={styles.manualContainer}>
                <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
                <View style={[styles.manualHeader, { paddingTop: insets.top, height: 56 + insets.top }]}>
                    <TouchableOpacity style={styles.manualHeaderIconBtn} onPress={() => setInputMode('camera_capture')}>
                        <Ionicons name="arrow-back" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={styles.manualHeaderTitle}>Ghi chép giao dịch</Text>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        style={styles.manualScrollContent}
                        contentContainerStyle={styles.manualScrollContentContainer}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                    <View style={styles.manualSegmentedControl}>
                        <TouchableOpacity
                            style={[styles.manualSegmentBtn, type === 'EXPENSE' && styles.manualSegmentBtnActiveExpense]}
                            onPress={() => setType('EXPENSE')}
                        >
                            <Text style={[styles.manualSegmentText, type === 'EXPENSE' && styles.manualSegmentTextActive]}>Khoản chi</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.manualSegmentBtn, type === 'INCOME' && styles.manualSegmentBtnActiveIncome]}
                            onPress={() => setType('INCOME')}
                        >
                            <Text style={[styles.manualSegmentText, type === 'INCOME' && styles.manualSegmentTextActive]}>Khoản thu</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.manualAmountSection}>
                        <Text style={styles.manualAmountLabel}>Nhập số tiền</Text>
                        <View style={styles.manualAmountRow}>
                            <View style={styles.manualAmountInputWrapper}>
                                <TextInput
                                    style={[
                                        styles.manualAmountInput,
                                        { color: '#111827' }
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
                                <Text style={styles.manualCurrencySymbol}>đ</Text>
                            </View>
                        </View>
                        {budgetInfo && (
                            <View style={[
                                styles.manualBudgetWarning,
                                budgetInfo.isExceeded ? styles.manualBudgetExceeded : styles.manualBudgetNearLimit
                            ]}>
                                <Ionicons
                                    name={budgetInfo.isExceeded ? "alert-circle" : "warning"}
                                    size={14}
                                    color={budgetInfo.isExceeded ? "#EF4444" : "#F59E0B"}
                                />
                                <Text style={[
                                    styles.manualBudgetWarningText,
                                    { color: budgetInfo.isExceeded ? "#EF4444" : "#F59E0B" }
                                ]}>
                                    {budgetInfo.isExceeded
                                        ? `Đã vượt ngân sách! Còn lại: ${new Intl.NumberFormat('vi-VN').format(budgetInfo.remaining)} đ`
                                        : `Sắp vượt hạn mức (${new Intl.NumberFormat('vi-VN').format(budgetInfo.remaining)} đ còn lại)`}
                                </Text>
                            </View>
                        )}
                    </View>

                    <Text style={styles.manualSectionTitle}>Danh mục giao dịch</Text>
                    {loading ? (
                        <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 20 }} />
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
                                style={styles.manualCategoriesPager}
                            >
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
                                        <View key={pageIndex} style={[styles.manualCategoryPage, { width: windowWidth - 40 }]}>
                                            <View style={styles.manualCategoriesGrid}>
                                                {page.map((item, idx) => {
                                                    if (item.type === 'category') {
                                                        const cat = item.data;
                                                        const isSelected = categoryId === cat?.id;
                                                        return (
                                                            <TouchableOpacity
                                                                key={cat?.id}
                                                                style={styles.manualCategoryGridItem}
                                                                onPress={() => setCategoryId(cat?.id || null)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={[
                                                                    styles.manualCatIconWrapper,
                                                                    { backgroundColor: (cat?.color || '#6366F1') + (isSelected ? '40' : '15') },
                                                                    isSelected && { borderWidth: 2, borderColor: cat?.color }
                                                                ]}>
                                                                    <Ionicons name={cat?.icon as any} size={24} color={cat?.color} />
                                                                    {isSelected && (
                                                                        <View style={[styles.manualCheckBadge, { backgroundColor: cat?.color }]}>
                                                                            <Ionicons name="checkmark" size={10} color="#FFF" />
                                                                        </View>
                                                                    )}
                                                                </View>
                                                                <Text style={[styles.manualCatName, isSelected && { color: cat?.color, fontWeight: '700' }]} numberOfLines={1}>
                                                                    {cat?.name}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        );
                                                    } else {
                                                        return (
                                                            <TouchableOpacity
                                                                key="add-btn"
                                                                style={styles.manualCategoryGridItem}
                                                                onPress={() => router.push(`/category-form?type=${type}` as any)}
                                                                activeOpacity={0.7}
                                                            >
                                                                <View style={[styles.manualCatIconWrapper, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' }]}>
                                                                    <Ionicons name="add" size={24} color="#6B7280" />
                                                                </View>
                                                                <Text style={styles.manualCatName} numberOfLines={1}>
                                                                    Tạo mới
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

                            {categories.length + 1 > 8 && (
                                <View style={styles.manualPaginationDots}>
                                    {Array.from({ length: Math.ceil((categories.length + 1) / 8) }).map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.manualDot,
                                                currentCategoryPage === i && styles.manualDotActive
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    <View style={styles.manualCardsSection}>
                        <TouchableOpacity style={styles.manualCard} onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                            <View style={[styles.manualCardIconBox, { backgroundColor: '#EEF2FF' }]}>
                                <Ionicons name="calendar" size={20} color="#6366F1" />
                            </View>
                            <View style={styles.manualCardContent}>
                                <Text style={styles.manualCardLabel}>Ngày thực hiện</Text>
                                <Text style={styles.manualCardValue}>{formatDate(date)}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.manualCard} onPress={() => setShowWalletModal(true)} activeOpacity={0.8}>
                            <View style={[styles.manualCardIconBox, { backgroundColor: '#F3E8FF' }]}>
                                <Ionicons name="wallet" size={20} color="#9333EA" />
                            </View>
                            <View style={styles.manualCardContent}>
                                <Text style={styles.manualCardLabel}>Nguồn tiền / Ví</Text>
                                <Text style={[styles.manualCardValue, !selectedWallet && { color: '#9CA3AF' }]}>
                                    {selectedWallet ? selectedWallet.name : 'Chọn ví'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.manualCard} onPress={() => setShowMoodModal(true)} activeOpacity={0.8}>
                            <View style={[styles.manualCardIconBox, { backgroundColor: '#FEF3C7' }]}>
                                <Ionicons name="happy" size={20} color="#D97706" />
                            </View>
                            <View style={styles.manualCardContent}>
                                <Text style={styles.manualCardLabel}>Tâm trạng chi tiêu</Text>
                                <Text style={[styles.manualCardValue, !mood && { color: '#9CA3AF' }]}>
                                    {mood ? MOODS.find(m => m.value === mood)?.label.replace('\n', ' ') : 'Chọn tâm trạng'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </TouchableOpacity>

                        <View style={styles.manualCard}>
                            <View style={[styles.manualCardIconBox, { backgroundColor: '#E0F2FE' }]}>
                                <Ionicons name="pencil" size={20} color="#0284C7" />
                            </View>
                            <View style={styles.manualCardContent}>
                                <Text style={styles.manualCardLabel}>Ghi chú thêm</Text>
                                <TextInput
                                    style={styles.manualCardTextInput}
                                    placeholder="Osaka, cà phê sáng..."
                                    placeholderTextColor="#9CA3AF"
                                    value={description}
                                    onChangeText={setDescription}
                                />
                            </View>
                        </View>
                    </View>

                    </ScrollView>

                    <View style={[styles.manualBottomFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 16 }]}>
                        <TouchableOpacity
                            style={[styles.manualSubmitBtn, isSaving && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={isSaving}
                            activeOpacity={0.95}
                        >
                            {isSaving ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.manualSubmitBtnText}>Lưu giao dịch</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

                <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chọn Danh mục</Text>
                                <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>
                            {loading ? (
                                <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 40 }} />
                            ) : (
                                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                    <View style={styles.categoriesModalGrid}>
                                        {categories.map(cat => {
                                            const isSelected = categoryId === cat.id;
                                            return (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    style={styles.categoryModalItem}
                                                    onPress={() => {
                                                        setCategoryId(cat.id);
                                                        setShowCategoryModal(false);
                                                    }}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={[
                                                        styles.catIconWrapper,
                                                        { backgroundColor: cat.color + (isSelected ? '40' : '15') },
                                                        isSelected && { borderWidth: 2.5, borderColor: cat.color }
                                                    ]}>
                                                        <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                                                    </View>
                                                    <Text style={[styles.catName, isSelected && { color: cat.color, fontWeight: '800' }]} numberOfLines={1}>
                                                        {cat.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Modal>

                <Modal visible={showWalletModal} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chọn Ví</Text>
                                <TouchableOpacity onPress={() => setShowWalletModal(false)} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={20} color="#374151" />
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
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.cardIconBox, { backgroundColor: '#EEF2FF' }]}>
                                            <Ionicons name="wallet" size={22} color="#6366F1" />
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

                <Modal visible={showMoodModal} animationType="slide" transparent={true}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chọn tâm trạng</Text>
                                <TouchableOpacity onPress={() => setShowMoodModal(false)} style={styles.modalCloseBtn}>
                                    <Ionicons name="close" size={20} color="#374151" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.categoriesModalGrid}>
                                {MOODS.map(m => {
                                    const isSelected = mood === m.value;
                                    return (
                                        <TouchableOpacity
                                            key={m.value}
                                            style={styles.categoryModalItem}
                                            onPress={() => {
                                                setMood(m.value);
                                                setShowMoodModal(false);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.catIconWrapper,
                                                { backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.15)' : '#F3F4F6' },
                                                isSelected && { borderWidth: 2, borderColor: '#F59E0B' }
                                            ]}>
                                                <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
                                            </View>
                                            <Text style={[styles.catName, isSelected && { color: '#F59E0B', fontWeight: '800' }]} numberOfLines={2}>
                                                {m.label.replace('\n', ' ')}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar 
                barStyle={imageUri ? "light-content" : "dark-content"} 
                translucent 
                backgroundColor="transparent" 
            />
            <View style={[styles.imageContainer, { flex: 1 }]}>
                {imageUri ? (
                    <View style={StyleSheet.absoluteFillObject}>
                        <Image source={{ uri: imageUri }} style={styles.transactionImage} resizeMode="cover" />
                        <LinearGradient
                            colors={['rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.05)', 'transparent']}
                            style={StyleSheet.absoluteFillObject}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 0.45 }}
                        />
                    </View>
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={44} color="#6366F1" />
                        <Text style={styles.imagePlaceholderText}>Quét hóa đơn thông minh hoặc chọn ảnh có sẵn 📸</Text>
                        <View style={styles.placeholderButtons}>
                            <TouchableOpacity style={styles.placeholderBtn} onPress={() => handlePickImage(true)} activeOpacity={0.8}>
                                <Ionicons name="camera" size={14} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.placeholderBtnText}>Chụp ảnh</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.placeholderBtn, { backgroundColor: '#6366F1' }]} onPress={() => handlePickImage(false)} activeOpacity={0.8}>
                                <Ionicons name="images" size={14} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.placeholderBtnText}>Thư viện</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {isScanning && (
                    <View style={styles.scanningOverlay}>
                        <ActivityIndicator size="large" color="#6366F1" />
                        <Text style={styles.scanningText}>AI đang phân tích hóa đơn... 🤖⚡</Text>
                    </View>
                )}

                <View style={[styles.topOverlayControls, { top: insets.top > 0 ? insets.top + 8 : 16 }]}>
                    <TouchableOpacity 
                        style={styles.overlayCircleBtnText} 
                        onPress={() => {
                            if (imageUri) {
                                setImageUri(null);
                                setInputMode('camera_capture');
                            } else {
                                router.back();
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.overlayCancelText}>Hủy</Text>
                    </TouchableOpacity>

                    <View style={styles.topRightControls}>
                        {user && !user.isPremium && (
                            <TouchableOpacity 
                                style={[styles.overlayCircleBtnText, { marginRight: 8 }]} 
                                onPress={() => setInputMode('manual')}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.overlayCancelText}>Nhập chi tiết</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.overlayCircleBtn} onPress={() => handlePickImage(false)} activeOpacity={0.7}>
                            <Ionicons name="images-outline" size={18} color="#FFF" />
                        </TouchableOpacity>
                        {imageUri && (
                            <TouchableOpacity 
                                style={[styles.overlayCircleBtn, { marginLeft: 8, backgroundColor: 'rgba(239, 68, 68, 0.8)' }]} 
                                onPress={() => {
                                    setImageUri(null);
                                    setInputMode('camera_capture');
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={18} color="#FFF" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                <View style={styles.centerGlassBox}>
                    <Text style={styles.glassAmountText} numberOfLines={1} adjustsFontSizeToFit>
                        {type === 'EXPENSE' ? '-' : '+'} {formatExpression(expression)} đ
                    </Text>
                    <TouchableOpacity 
                        style={styles.glassDetailBtn}
                        onPress={() => setShowDescriptionModal(true)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="pencil" size={12} color="#6366F1" style={{ marginRight: 6 }} />
                        <Text style={styles.glassDetailText}>
                            {description ? description : 'Thêm ghi chú giao dịch'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.whiteBody, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]}>
                <View style={[styles.pillsContainer, { marginBottom: isSmallScreen ? 8 : 16 }]}>
                    <View style={[styles.pillsDoubleRow, { gap: isSmallScreen ? 8 : 10, marginBottom: isSmallScreen ? 6 : 10 }]}>
                        <TouchableOpacity 
                            style={[styles.pillButton, styles.pillCategory]} 
                            onPress={() => setShowCategoryModal(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons 
                                name={categories.find(c => c.id === categoryId)?.icon as any || "grid-outline"} 
                                size={14} 
                                color="#6366F1" 
                                style={{ marginRight: 6 }} 
                            />
                            <Text style={styles.pillButtonTextCategory}>
                                {categories.find(c => c.id === categoryId)?.name || 'Danh mục'}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#6366F1" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.pillButton, styles.pillWallet]} 
                            onPress={() => setShowWalletModal(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="wallet-outline" size={14} color="#374151" style={{ marginRight: 6 }} />
                            <Text style={styles.pillButtonTextWallet}>
                                {selectedWallet ? selectedWallet.name : 'Chọn ví'}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#9CA3AF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.switcherRow, { marginVertical: isSmallScreen ? 2 : 4 }]}>
                        <View style={styles.calcSegmentedControl}>
                            <TouchableOpacity
                                style={[
                                    styles.calcSegmentBtn,
                                    type === 'EXPENSE' && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }
                                ]}
                                onPress={() => setType('EXPENSE')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-down-circle-outline" size={14} color={type === 'EXPENSE' ? '#EF4444' : '#9CA3AF'} style={{ marginRight: 6 }} />
                                <Text style={[
                                    styles.calcSegmentText,
                                    type === 'EXPENSE' ? { color: '#EF4444', fontWeight: '700' } : { color: '#9CA3AF' }
                                ]}>
                                    Chi tiêu
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.calcSegmentBtn,
                                    type === 'INCOME' && { backgroundColor: '#D1FAE5', borderColor: '#A7F3D0' }
                                ]}
                                onPress={() => setType('INCOME')}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-up-circle-outline" size={14} color={type === 'INCOME' ? '#10B981' : '#9CA3AF'} style={{ marginRight: 6 }} />
                                <Text style={[
                                    styles.calcSegmentText,
                                    type === 'INCOME' ? { color: '#10B981', fontWeight: '700' } : { color: '#9CA3AF' }
                                ]}>
                                    Thu nhập
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.pillsDoubleRow, { gap: isSmallScreen ? 8 : 10, marginBottom: isSmallScreen ? 6 : 10 }]}>
                        <TouchableOpacity 
                            style={styles.pillButton} 
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="calendar-outline" size={14} color="#374151" style={{ marginRight: 6 }} />
                            <Text style={styles.pillButtonTextWallet}>
                                {date && date.toDateString() === new Date().toDateString() 
                                    ? 'Hôm nay' 
                                    : date 
                                    ? `Ngày ${date.getDate()} Thg ${date.getMonth() + 1}` 
                                    : 'Hôm nay'}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color="#9CA3AF" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[
                                styles.pillButton, 
                                { 
                                    backgroundColor: getMoodTheme(mood).bg, 
                                    borderColor: getMoodTheme(mood).border 
                                }
                            ]} 
                            onPress={() => setShowMoodModal(true)}
                            activeOpacity={0.8}
                        >
                            <Text style={{ fontSize: 14, marginRight: 6 }}>
                                {getMoodTheme(mood).emoji}
                            </Text>
                            <Text style={[styles.pillButtonTextWallet, { color: getMoodTheme(mood).textColor }]}>
                                {mood ? MOODS.find(m => m.value === mood)?.label.replace('\n', ' ') : 'Tâm trạng'}
                            </Text>
                            <Ionicons name="chevron-down" size={12} color={getMoodTheme(mood).textColor} style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Light Calculator Keyboard */}
                <View style={[styles.keyboardContainer, { marginTop: isSmallScreen ? 4 : 8 }]}>
                    <View style={[styles.keyboardRow, { gap: rowGap, marginBottom: rowGap }]}>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('C')} activeOpacity={0.7}>
                            <Text style={[styles.keyText, { color: '#EF4444' }]}>C</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('backspace')} activeOpacity={0.7}>
                            <Ionicons name="backspace-outline" size={20} color="#6B7280" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('000')} activeOpacity={0.7}>
                            <Text style={styles.keyTextOperator}>000</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('/')} activeOpacity={0.7}>
                            <Text style={[styles.keyTextOperator, { color: '#6366F1' }]}>÷</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.keyboardRow, { gap: rowGap, marginBottom: rowGap }]}>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('7')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>7</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('8')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>8</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('9')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>9</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('*')} activeOpacity={0.7}>
                            <Text style={[styles.keyTextOperator, { color: '#6366F1' }]}>×</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.keyboardRow, { gap: rowGap, marginBottom: rowGap }]}>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('4')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>4</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('5')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>5</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('6')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>6</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('-')} activeOpacity={0.7}>
                            <Text style={[styles.keyTextOperator, { color: '#6366F1' }]}>-</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.keyboardRow, { gap: rowGap, marginBottom: rowGap }]}>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('1')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>1</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('2')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>2</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('3')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>3</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.operatorKey, { height: keyHeight }]} onPress={() => handleKeyPress('+')} activeOpacity={0.7}>
                            <Text style={[styles.keyTextOperator, { color: '#6366F1' }]}>+</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.keyboardRow, { gap: rowGap, marginBottom: rowGap }]}>
                        <TouchableOpacity style={[styles.keyButton, { flex: 2, height: keyHeight }]} onPress={() => handleKeyPress('0')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>0</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, { height: keyHeight }]} onPress={() => handleKeyPress('.')} activeOpacity={0.7}>
                            <Text style={styles.keyText}>.</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.keyButton, styles.submitKey, { height: keyHeight }]} onPress={() => handleKeyPress('submit')} activeOpacity={0.7}>
                            <Ionicons name="checkmark" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <CustomDatePicker
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                initialDate={date}
                onSelect={(selectedDate) => {
                    setDate(selectedDate);
                }}
            />

            <Modal visible={showDescriptionModal} animationType="fade" transparent={true}>
                <View style={styles.darkModalOverlay}>
                    <View style={styles.glassModalContent}>
                        <Text style={styles.glassModalTitle}>Ghi chú giao dịch</Text>
                        <TextInput
                            style={styles.glassModalInput}
                            placeholder="大阪で昼ご飯, Cà phê Highland..."
                            placeholderTextColor="#9CA3AF"
                            value={description}
                            onChangeText={setDescription}
                            autoFocus={true}
                        />
                        <TouchableOpacity 
                            style={styles.glassModalBtn} 
                            onPress={() => setShowDescriptionModal(false)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.glassModalBtnText}>Xác nhận</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Danh mục</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        
                        {loading ? (
                            <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 40 }} />
                        ) : (
                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                <View style={styles.categoriesModalGrid}>
                                    {categories.map(cat => {
                                        const isSelected = categoryId === cat.id;
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                style={styles.categoryModalItem}
                                                onPress={() => {
                                                    setCategoryId(cat.id);
                                                    setShowCategoryModal(false);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={[
                                                    styles.catIconWrapper,
                                                    { backgroundColor: cat.color + (isSelected ? '40' : '15') },
                                                    isSelected && { borderWidth: 2.5, borderColor: cat.color }
                                                ]}>
                                                    <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                                                </View>
                                                <Text style={[styles.catName, isSelected && { color: cat.color, fontWeight: '800' }]} numberOfLines={1}>
                                                    {cat.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    
                                    <TouchableOpacity
                                        style={styles.categoryModalItem}
                                        onPress={() => {
                                            setShowCategoryModal(false);
                                            router.push(`/category-form?type=${type}` as any);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.catIconWrapper, { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderStyle: 'dashed' }]}>
                                            <Ionicons name="add" size={24} color="#6B7280" />
                                        </View>
                                        <Text style={styles.catName} numberOfLines={1}>
                                            Thêm mới
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            <Modal visible={showWalletModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn Ví tiền</Text>
                            <TouchableOpacity onPress={() => setShowWalletModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
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
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.cardIconBox, { backgroundColor: '#EEF2FF' }]}>
                                        <Ionicons name="wallet" size={22} color="#6366F1" />
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

            <Modal visible={showMoodModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Chọn tâm trạng</Text>
                            <TouchableOpacity onPress={() => setShowMoodModal(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={20} color="#374151" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.categoriesModalGrid}>
                            {MOODS.map(m => {
                                const isSelected = mood === m.value;
                                return (
                                    <TouchableOpacity
                                        key={m.value}
                                        style={styles.categoryModalItem}
                                        onPress={() => {
                                            setMood(m.value);
                                            setShowMoodModal(false);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[
                                            styles.catIconWrapper,
                                            { backgroundColor: isSelected ? 'rgba(251, 191, 36, 0.15)' : '#F3F4F6' },
                                            isSelected && { borderWidth: 2, borderColor: '#F59E0B' }
                                        ]}>
                                            <Text style={{ fontSize: 26 }}>{m.emoji}</Text>
                                        </View>
                                        <Text style={[styles.catName, isSelected && { color: '#F59E0B', fontWeight: '800' }]} numberOfLines={2}>
                                            {m.label.replace('\n', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Camera captures view
    captureContainer: { flex: 1, backgroundColor: '#000000' },
    captureHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 16 },
    captureCancelBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    cameraFrame: { flex: 1, overflow: 'hidden', marginHorizontal: 20, borderRadius: 24, backgroundColor: '#000000', borderWidth: 1, borderColor: '#1F2937' },
    cameraView: { flex: 1, justifyContent: 'space-between', padding: 16 },
    cameraInnerTop: { flexDirection: 'row', justifyContent: 'space-between' },
    cameraInnerBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    zoomContainer: { flexDirection: 'row', gap: 8, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 18 },
    zoomPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    zoomPillActive: { backgroundColor: '#FFFFFF' },
    zoomText: { color: '#CCCCCC', fontSize: 11, fontWeight: '700' },
    zoomTextActive: { color: '#000000' },
    cameraPermContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    cameraPermText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    cameraPermBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#6366F1' },
    cameraPermBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    captureBottomControls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 24 },
    captureOuterCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    captureInnerCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
    libraryCapsule: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)' },
    libraryCapsuleText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    skipBtn: { paddingVertical: 10, paddingHorizontal: 14 },
    skipBtnText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },

    // Top Card / Image area
    imageContainer: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        position: 'relative',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    transactionImage: { width: '100%', height: '100%' },
    imagePlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 20 },
    imagePlaceholderText: { color: '#6B7280', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 10, marginBottom: 14, paddingHorizontal: 24 },
    placeholderButtons: { flexDirection: 'row', gap: 10 },
    placeholderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    placeholderBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    manualEntryLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#EEF2FF',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#E0E7FF',
    },
    manualEntryLinkText: {
        fontSize: 12,
        color: '#6366F1',
        fontWeight: '700',
    },
    scanningOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    scanningText: { color: '#6366F1', fontSize: 13, fontWeight: '700', marginTop: 10 },
    topOverlayControls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 },
    overlayCircleBtnText: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    overlayCancelText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    overlayCircleBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    topRightControls: { flexDirection: 'row', alignItems: 'center' },
    centerGlassBox: { position: 'absolute', left: 20, right: 20, bottom: 20, padding: 14, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    glassAmountText: { fontSize: 32, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 6, fontVariant: ['tabular-nums'] },
    glassDetailBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    glassDetailText: { color: '#374151', fontSize: 11, fontWeight: '700' },

    // White body for calculator
    whiteBody: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 10 },
    pillsContainer: { alignItems: 'center' },
    pillsDoubleRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', width: '100%' },
    pillButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB' },
    pillCategory: { backgroundColor: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)' },
    pillWallet: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
    pillButtonTextCategory: { color: '#6366F1', fontSize: 12, fontWeight: '700' },
    pillButtonTextWallet: { color: '#374151', fontSize: 12, fontWeight: '700' },
    switcherRow: { alignItems: 'center' },
    calcSegmentedControl: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 16, padding: 4, gap: 4 },
    calcSegmentBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    calcSegmentText: { fontSize: 12, fontWeight: '700' },

    // Calculator Keypad
    keyboardContainer: { width: '100%', paddingBottom: 10 },
    keyboardRow: { flexDirection: 'row', justifyContent: 'space-between' },
    keyButton: { flex: 1, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
    keyText: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
    keyTextOperator: { fontSize: 18, fontWeight: '700' },
    operatorKey: { backgroundColor: '#EEF2FF', borderColor: '#D9E2FC' },
    submitKey: { backgroundColor: '#6366F1', borderColor: '#4F46E5', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },

    // Manual input screen
    manualContainer: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    manualHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    manualHeaderIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
    manualHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    manualScrollContent: { flex: 1, backgroundColor: '#FFFFFF' },
    manualScrollContentContainer: { padding: 20 },
    manualSegmentedControl: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 16, padding: 4, marginBottom: 20 },
    manualSegmentBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    manualSegmentBtnActiveExpense: { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
    manualSegmentBtnActiveIncome: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.1, shadowRadius: 4, elevation: 1 },
    manualSegmentText: { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
    manualSegmentTextActive: { color: '#FFFFFF' },
    manualAmountSection: { marginBottom: 24 },
    manualAmountLabel: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 8 },
    manualAmountRow: { flexDirection: 'row', alignItems: 'center' },
    manualAmountInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, height: 48 },
    manualAmountInput: { flex: 1, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
    manualCurrencySymbol: { fontSize: 14, fontWeight: '700', color: '#6B7280', paddingLeft: 6 },
    manualBudgetWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
    manualBudgetExceeded: { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' },
    manualBudgetNearLimit: { backgroundColor: '#FFFBEB', borderColor: '#FEF3C7' },
    manualBudgetWarningText: { fontSize: 11, fontWeight: '600' },
    manualSectionTitle: { fontSize: 11, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5, marginBottom: 12 },
    manualCategoriesPager: { marginHorizontal: -20, marginBottom: 14 },
    manualCategoryPage: { paddingHorizontal: 20 },
    manualCategoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    manualCategoryGridItem: { width: (width - 76) / 4, alignItems: 'center', marginBottom: 12 },
    manualCatIconWrapper: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    manualCheckBadge: { position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
    manualCatName: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 6, textAlign: 'center', width: '100%' },
    manualPaginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 16 },
    manualDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
    manualDotActive: { backgroundColor: '#6366F1', width: 12 },
    manualCardsSection: { gap: 12, marginBottom: 20 },
    manualCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 12, alignItems: 'center' },
    manualCardIconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    manualCardContent: { flex: 1 },
    manualCardLabel: { fontSize: 10, color: '#9CA3AF', fontWeight: '700', letterSpacing: 0.5 },
    manualCardValue: { fontSize: 13, fontWeight: '700', color: '#1F2937', marginTop: 3 },
    manualCardTextInput: { fontSize: 13, fontWeight: '700', color: '#1F2937', padding: 0, marginTop: 3 },
    manualBottomFooter: { paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    manualSubmitBtn: { flexDirection: 'row', backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
    manualSubmitBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    
    // Modal controls general
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '65%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    categoriesModalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    categoryModalItem: { width: (width - 76) / 4, alignItems: 'center', marginBottom: 14 },
    catIconWrapper: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    catName: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginTop: 6, textAlign: 'center', width: '100%' },
    listRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    walletInfo: { flex: 1 },
    walletName: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    walletBal: { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginTop: 2, fontVariant: ['tabular-nums'] },

    // Description text edit Modal
    darkModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    glassModalContent: { width: width - 48, padding: 20, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
    glassModalTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 16 },
    glassModalInput: { width: '100%', height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, fontSize: 13, color: '#1F2937', fontWeight: '600', marginBottom: 16 },
    glassModalBtn: { backgroundColor: '#6366F1', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12 },
    glassModalBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }
});
