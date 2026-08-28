import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, ScrollView, Modal, ActivityIndicator, Platform, useWindowDimensions, Image, KeyboardAvoidingView, Dimensions, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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
import CustomNumpad from '../../src/components/common/CustomNumpad';
import { useToast } from '../../src/components/common/Toast';
import * as ImagePicker from 'expo-image-picker';
import UserService, { UserProfile } from '../../src/services/user.service';
import { AiService } from '../../src/services/ai.service';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AiLimitService } from '../../src/utils/aiLimit';
import diaryService from '../../src/services/diary.service';

const { width, height } = Dimensions.get('window');
type TransactionType = 'EXPENSE' | 'INCOME';

const MOODS = [
  { emoji: '😭', label: 'Rất tệ', value: 'very_bad' },
  { emoji: '😞', label: 'Tệ', value: 'bad' },
  { emoji: '😐', label: 'Bình thường', value: 'neutral' },
  { emoji: '😊', label: 'Tốt', value: 'good' },
  { emoji: '🥰', label: 'Rất tốt', value: 'very_good' },
];

const getMoodTheme = (moodValue: string | null) => {
    switch (moodValue) {
        case 'very_good':
            return {
                bg: 'rgba(236, 72, 153, 0.08)',
                border: 'rgba(236, 72, 153, 0.2)',
                textColor: '#EC4899',
                emoji: '🥰'
            };
        case 'good':
            return {
                bg: 'rgba(16, 185, 129, 0.08)',
                border: 'rgba(16, 185, 129, 0.2)',
                textColor: '#10B981',
                emoji: '😊'
            };
        case 'neutral':
            return {
                bg: 'rgba(156, 163, 175, 0.08)',
                border: 'rgba(156, 163, 175, 0.2)',
                textColor: '#6B7280',
                emoji: '😐'
            };
        case 'bad':
            return {
                bg: 'rgba(245, 158, 11, 0.08)',
                border: 'rgba(245, 158, 11, 0.2)',
                textColor: '#D97706',
                emoji: '😞'
            };
        case 'very_bad':
            return {
                bg: 'rgba(239, 68, 68, 0.08)',
                border: 'rgba(239, 68, 68, 0.2)',
                textColor: '#EF4444',
                emoji: '😭'
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
            if (params.fromAssistant === 'true' || params.amount) {
                const initAmount = params.amount ? (params.amount as string) : '0';
                setExpression(initAmount);
                setAmount(initAmount);
                setInputMode('manual');
            } else {
                setAmount('');
                setExpression('0');
                setInputMode('camera_capture');
            }

            if (params.description) {
                setDescription(params.description as string);
            } else {
                setDescription('');
            }
            
            if (params.categoryId) {
                setCategoryId(Number(params.categoryId));
            }
            
            if (params.walletId) {
                setWalletId(Number(params.walletId));
            }

            setImageUri(null);
            setMood(null);

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
                router.setParams({ 
                    initialType: undefined,
                    amount: undefined,
                    categoryId: undefined,
                    description: undefined,
                    walletId: undefined
                });
            } else {
                fetchInitialData(type);
                if (params.amount) {
                    router.setParams({ 
                        amount: undefined,
                        categoryId: undefined,
                        description: undefined,
                        walletId: undefined
                    });
                }
            }
        }, [params.initialType, params.date, params.amount, params.categoryId, params.description, params.walletId]) 
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
        const finalAmount = evaluateExpression(expression);
        if (type !== 'EXPENSE' || !categoryId || finalAmount <= 0) return null;

        const selectedMonth = date.getMonth() + 1;
        const selectedYear = date.getFullYear();

        const relevantBudgets = budgets.filter(b => {
            return b.periodValue === selectedMonth && b.year === selectedYear;
        });

        const catBudget = relevantBudgets.find(b => b.categoryId === categoryId);
        const totalBudget = relevantBudgets.find(b => !b.categoryId);

        const activeBudget = catBudget || totalBudget;
        if (!activeBudget) return null;

        const numericAmount = finalAmount;
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
        const finalAmount = evaluateExpression(expression);
        if (isNaN(finalAmount) || finalAmount <= 0) {
            toast.error('Số tiền không hợp lệ', 'Vui lòng nhập số tiền hợp lệ.');
            return;
        }
        
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (date > today) {
            toast.error('Ngày không hợp lệ', 'Không thể chọn ngày ở tương lai.');
            return;
        }
        if (!categoryId) {
            toast.error('Chưa chọn danh mục', 'Vui lòng chọn danh mục cho giao dịch.');
            return;
        }
        if (!walletId) {
            toast.error('Chưa chọn ví', 'Vui lòng chọn ví để lưu giao dịch.');
            return;
        }

        if (imageUri && user && !user.isPremium) {
            try {
                setLoading(true);
                const txs = await TransactionService.getMyTransactions();
                const imageCount = txs.filter(t => !!t.imageUrl).length;
                if (imageCount >= 9) {
                    toast.info('Giới hạn hình ảnh', 'Tài khoản miễn phí chỉ được tải lên tối đa 9 ảnh. Vui lòng nâng cấp Premium để không giới hạn.');
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
            const finalAmount = evaluateExpression(expression);
            const req: TransactionRequest = {
                amount: finalAmount,
                type,
                categoryId: categoryId!,
                walletId: walletId!,
                transactionDate: date.toISOString(),
                description,
                imageUrl: finalImageUrl,
                mood: mood || undefined
            };
            const createdTx = await TransactionService.createTransaction(req);

            // Auto sync to Diary if an image is attached
            if (imageUri) {
                try {
                    const moodLabel = mood ? mood : 'neutral';
                    const fullNote = description ? `[${moodLabel}] ${description}` : `[${moodLabel}] Thêm từ Thu Chi`;
                    await diaryService.create({
                        imageUri: imageUri,
                        note: fullNote,
                        entryDate: date.toISOString().split('T')[0],
                        transactionId: createdTx.id
                    });
                } catch (diaryErr) {
                    console.log("Failed to auto-create diary entry", diaryErr);
                }
            }

            toast.success('Lưu thành công', 'Giao dịch của bạn đã được ghi lại thành công.');
            setTimeout(() => {
                setExpression('0');
                setAmount('');
                setDescription('');
                setImageUri(null);
                setMood(null);
                setInputMode('camera_capture');
                router.replace('/');
            }, 1200);
        } catch (err: any) {
            console.log(err);
            toast.error('Lưu thất bại', err.response?.data?.message || err.message || 'Không thể thêm giao dịch lúc này.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyPress = (key: string) => {
        Keyboard.dismiss();
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
                    toast.error('Cần quyền truy cập', 'Vui lòng cho phép truy cập camera.');
                    return;
                }
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['images'],
                    quality: 0.5,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    toast.error('Cần quyền truy cập', 'Vui lòng cho phép truy cập thư viện.');
                    return;
                }
                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['images'],
                    quality: 0.8,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setImageUri(asset.uri);
                setInputMode('calculator');
                toast.success('Đã đính kèm ảnh', 'Vui lòng nhập số tiền và chọn chi tiết giao dịch.');
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
                toast.error('Cần quyền truy cập', 'Vui lòng cho phép truy cập camera.');
                return;
            }
        }
        try {
            const photo = await cameraRef.current?.takePictureAsync({
                quality: 0.5,
            });
            if (photo && photo.uri) {
                setImageUri(photo.uri);
                setInputMode('calculator');
                toast.success('Đã đính kèm ảnh', 'Vui lòng nhập số tiền và chọn chi tiết giao dịch.');
            }
        } catch (err) {
            console.log("Error capturing photo", err);
            toast.error('Thất bại', 'Không thể chụp ảnh từ Camera.');
        }
    };



    const selectedWallet = wallets.find(w => w.id === walletId);

    if (inputMode === 'camera_capture') {
        return (
            <View style={styles.captureContainer}>
                <StatusBar style="light" animated />
                
                <View style={[styles.captureHeader, { paddingTop: Math.max(insets.top, 16), height: 56 + Math.max(insets.top, 16) }]}>
                    <TouchableOpacity style={styles.captureCancelBtn} onPress={() => router.back()} activeOpacity={0.7}>
                        <Text style={styles.captureCancelText}>Hủy</Text>
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
                    <View style={styles.captureButtonContainer}>
                        <LinearGradient
                            colors={['#3B82F6', '#8B5CF6', '#D946EF', '#F43F5E']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.captureGradientRing}
                        >
                            <TouchableOpacity style={styles.captureOuterCircle} onPress={handleCapture} activeOpacity={0.85}>
                                <View style={styles.captureInnerCircle} />
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>

                    <TouchableOpacity style={styles.libraryCapsule} onPress={() => handlePickImage(false)}>
                        <Ionicons name="images-outline" size={18} color="#D946EF" style={{ marginRight: 8 }} />
                        <Text style={styles.libraryCapsuleText}>Chọn từ thư viện</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.skipBtn} onPress={() => setInputMode('manual')}>
                        <Text style={styles.skipBtnText}>Bỏ qua ảnh</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // Render Manual & Calculator Modes

        const catName = categories.find(c => c.id === categoryId)?.name || 'Danh mục';
        const isExpense = type === 'EXPENSE';
        const catIcon = categories.find(c => c.id === categoryId)?.icon || 'apps-outline';
        
        // Determine the gradient colors based on Expense/Income
        const gradientColors = isExpense 
            ? ['#EF4444', '#B91C1C', '#7F1D1D'] 
            : ['#10B981', '#047857', '#064E3B'];

        const displayDate = date.toDateString() === new Date().toDateString() ? 'Hôm nay' : formatDate(date);

        return (
            <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setIsAmountFocused(false); }}>
                <View style={styles.manualContainer}>
                    <StatusBar style="light" animated />
                
                {/* Top Half: Photo or Gradient */}
                {imageUri ? (
                    <View style={[styles.manualTopHalf, { paddingTop: insets.top, paddingHorizontal: 0, paddingBottom: 0 }]}>
                        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        {/* Dark overlay for readability */}
                        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' }} />
                        
                        <View style={{ flex: 1 }} />
                        <View style={[styles.manualAmountGlassCard, { marginHorizontal: 20, marginBottom: 20 }]}>
                            {/* The Glass Card inside Photo */}
                            <View style={styles.manualAmountRow}>
                                <Text style={[styles.manualAmountSign, !isExpense && { color: '#10B981' }]}>
                                    {isExpense ? '-' : '+'}
                                </Text>
                                <TextInput
                                    style={styles.manualAmountValue}
                                    placeholder="0"
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    value={expression !== '0' && expression !== '' ? formatExpression(expression) : ''}
                                    onChangeText={(text) => {
                                        const numeric = text.replace(/[^0-9]/g, '');
                                        setExpression(numeric || '0');
                                    }}
                                    keyboardType="numeric"
                                    returnKeyType="done"
                                    onFocus={() => setIsAmountFocused(true)}
                                    onBlur={() => setIsAmountFocused(false)}
                                />
                                <Text style={styles.manualAmountCurrency}>đ</Text>
                            </View>

                            <View style={styles.manualNoteInputWrapper}>
                                <Ionicons name="pencil" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.manualNoteInput}
                                    placeholder="Thêm chi tiết"
                                    placeholderTextColor="#9CA3AF"
                                    value={description}
                                    onChangeText={setDescription}
                                    onFocus={() => setIsAmountFocused(false)}
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        Keyboard.dismiss();
                                        setIsAmountFocused(true);
                                    }}
                                />
                            </View>
                        </View>
                    </View>
                ) : (
                    <LinearGradient
                        colors={gradientColors as [string, string, string]}
                        style={[styles.manualTopHalf, { paddingTop: insets.top }]}
                    >
                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <View style={styles.manualBigCatIconContainer}>
                                <TouchableOpacity 
                                    style={styles.manualBigCatIconBg}
                                    onPress={() => {
                                        setIsAmountFocused(false);
                                        setShowCategoryModal(true);
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Ionicons name={catIcon as any} size={48} color="#FFFFFF" />
                                </TouchableOpacity>
                                <Text style={styles.manualBigCatName}>{catName}</Text>
                            </View>
                        </View>

                        <View style={styles.manualAmountGlassCard}>
                            <View style={styles.manualAmountRow}>
                                <Text style={[styles.manualAmountSign, !isExpense && { color: '#10B981' }]}>
                                    {isExpense ? '-' : '+'}
                                </Text>
                                <TextInput
                                    style={styles.manualAmountValue}
                                    placeholder="0"
                                    placeholderTextColor="rgba(255,255,255,0.6)"
                                    value={expression !== '0' && expression !== '' ? formatExpression(expression) : ''}
                                    onChangeText={(text) => {
                                        const numeric = text.replace(/[^0-9]/g, '');
                                        setExpression(numeric || '0');
                                    }}
                                    keyboardType="numeric"
                                    returnKeyType="done"
                                    onFocus={() => setIsAmountFocused(true)}
                                    onBlur={() => setIsAmountFocused(false)}
                                />
                                <Text style={styles.manualAmountCurrency}>đ</Text>
                            </View>

                            <View style={styles.manualNoteInputWrapper}>
                                <Ionicons name="pencil" size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                                <TextInput
                                    style={styles.manualNoteInput}
                                    placeholder="Thêm chi tiết"
                                    placeholderTextColor="#9CA3AF"
                                    value={description}
                                    onChangeText={setDescription}
                                    onFocus={() => setIsAmountFocused(false)}
                                    returnKeyType="done"
                                    onSubmitEditing={() => {
                                        Keyboard.dismiss();
                                        setIsAmountFocused(true);
                                    }}
                                />
                            </View>
                        </View>
                    </LinearGradient>
                )}

                {/* Bottom Half: Black Background */}
                <View style={styles.manualBottomHalf}>
                    
                    {/* Selectors Container */}
                    <View style={styles.manualControlsContainer}>
                        {/* Mood Selector */}
                        <View style={styles.moodSelector}>
                            {(['happy', 'neutral', 'sad'] as const).map(m => (
                                <TouchableOpacity 
                                    key={m} 
                                    style={[styles.moodBtn, mood === m && styles.moodBtnActive]}
                                    onPress={() => setMood(mood === m ? null : m)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.moodEmoji}>{m === 'happy' ? '😊' : m === 'neutral' ? '😐' : '😢'}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.manualSelectorsRow}>
                            <TouchableOpacity 
                                style={[styles.manualSelectorPill, { borderColor: isExpense ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)' }]} 
                                onPress={() => { Keyboard.dismiss(); setIsAmountFocused(false); setShowCategoryModal(true); }}
                            >
                                <Ionicons name={catIcon as any} size={14} color="#D1D5DB" />
                                <Text style={styles.manualSelectorText}>{catName}</Text>
                                <Ionicons name="chevron-down" size={12} color="#D1D5DB" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.manualSelectorPill, { borderColor: isExpense ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)' }]} 
                                onPress={() => { Keyboard.dismiss(); setIsAmountFocused(false); setShowWalletModal(true); }}
                            >
                                <Ionicons name="wallet" size={14} color="#D1D5DB" />
                                <Text style={styles.manualSelectorText}>{selectedWallet?.name || 'Wallet'}</Text>
                                <Ionicons name="chevron-down" size={12} color="#D1D5DB" />
                            </TouchableOpacity>
                        </View>

                        {/* Toggle Expense/Income Row */}
                        <View style={styles.manualToggleRow}>
                            <View style={styles.manualToggleContainer}>
                                <TouchableOpacity 
                                    style={[styles.manualToggleBtn, isExpense && styles.manualToggleBtnActiveExpense]}
                                    onPress={() => setType('EXPENSE')}
                                >
                                    <Text style={[styles.manualToggleText, isExpense && { color: '#FFF' }]}>Chi tiêu</Text>
                                    <Ionicons name="arrow-down-outline" size={16} color={isExpense ? "#FFF" : "#6B7280"} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.manualToggleBtn, !isExpense && styles.manualToggleBtnActiveIncome]}
                                    onPress={() => setType('INCOME')}
                                >
                                    <Text style={[styles.manualToggleText, !isExpense && { color: '#FFF' }]}>Thu nhập</Text>
                                    <Ionicons name="arrow-up-outline" size={16} color={!isExpense ? "#FFF" : "#6B7280"} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Date Selector Row */}
                        <View style={styles.manualDateRow}>
                            <TouchableOpacity style={styles.manualSelectorPill} onPress={() => { setIsAmountFocused(false); setShowDatePicker(true); }}>
                                <Ionicons name="calendar" size={14} color="#D1D5DB" />
                                <Text style={styles.manualSelectorText}>{displayDate}</Text>
                                <Ionicons name="chevron-down" size={12} color="#D1D5DB" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.actionButtonsRow}>
                        <View style={styles.actionRoundBtnContainer}>
                            <TouchableOpacity 
                                style={styles.actionRoundBtnCancel} 
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
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                            <Text style={styles.actionRoundBtnText}>Hủy</Text>
                        </View>

                        <TouchableOpacity style={styles.actionSaveBtnOuter} onPress={handleSave} activeOpacity={0.8}>
                            <View style={styles.actionSaveBtnInner}>
                                {isSaving ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Ionicons name="checkmark" size={32} color="#FFF" />
                                )}
                            </View>
                        </TouchableOpacity>
                        
                        <View style={styles.actionRoundBtnContainer}>
                            {/* Empty container to keep the Save button centered */}
                        </View>
                    </View>
                </View>

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

                <CustomDatePicker
                    visible={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    initialDate={new Date(date)}
                    maxDate={new Date()}
                    onSelect={(selectedDate) => {
                        setDate(selectedDate);
                    }}
                />
            </View>
            </TouchableWithoutFeedback>
        );
    }

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Camera captures view
    captureContainer: { flex: 1, backgroundColor: '#111111' },
    captureHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 16 },
    captureCancelBtn: { paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    captureCancelText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
    cameraFrame: { flex: 1, overflow: 'hidden', marginHorizontal: 20, borderRadius: 32, backgroundColor: '#000000', marginTop: 10 },
    cameraView: { flex: 1, justifyContent: 'space-between', padding: 16 },
    cameraInnerTop: { flexDirection: 'row', justifyContent: 'space-between' },
    cameraInnerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    zoomContainer: { flexDirection: 'row', gap: 4, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20, marginBottom: 10 },
    zoomPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    zoomPillActive: { backgroundColor: 'transparent' },
    zoomText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    zoomTextActive: { color: '#FBBF24' },
    cameraPermContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 },
    cameraPermText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    cameraPermBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: '#6366F1' },
    cameraPermBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    captureBottomControls: { alignItems: 'center', paddingHorizontal: 30, paddingBottom: 40, paddingTop: 20 },
    captureButtonContainer: { alignItems: 'center', marginBottom: 24 },
    captureGradientRing: { width: 84, height: 84, borderRadius: 42, padding: 4, justifyContent: 'center', alignItems: 'center' },
    captureOuterCircle: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#111111', padding: 4, justifyContent: 'center', alignItems: 'center' },
    captureInnerCircle: { width: '100%', height: '100%', borderRadius: 40, backgroundColor: '#FFFFFF' },
    libraryCapsule: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(217, 70, 239, 0.15)', alignSelf: 'center', marginBottom: 20 },
    libraryCapsuleText: { color: '#D946EF', fontSize: 14, fontWeight: '600' },
    skipBtn: { paddingVertical: 10, alignSelf: 'center' },
    skipBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },

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
    
    moodSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 16 },
    moodBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    moodBtnActive: { backgroundColor: '#FCE7F3', borderColor: '#EC4899' },
    moodEmoji: { fontSize: 24 },

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

    // Manual input screen (New Redesign)
    manualContainer: { flex: 1, backgroundColor: '#111111' },
    manualTopHalf: { flex: 1.1, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, paddingBottom: 20, paddingHorizontal: 20, overflow: 'hidden' },
    manualBottomHalf: { flex: 1, backgroundColor: '#111111', paddingTop: 12, paddingHorizontal: 16, justifyContent: 'space-between', paddingBottom: 16 },
    manualControlsContainer: { justifyContent: 'center', paddingTop: 4 },
    manualHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    manualHeaderIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    manualCameraBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    manualBigCatIconContainer: { alignItems: 'center', marginBottom: 20 },
    manualBigCatIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    manualBigCatName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
    manualAmountGlassCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
    manualAmountRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    manualAmountSign: { fontSize: 24, fontWeight: '700', color: '#EF4444', marginRight: 8, marginTop: 4 },
    manualAmountValue: { flex: 1, fontSize: 44, fontWeight: '700', color: '#FFFFFF', fontVariant: ['tabular-nums'], textAlign: 'center', padding: 0 },
    manualAmountCurrency: { fontSize: 18, fontWeight: '700', color: '#D1D5DB', marginLeft: 8, marginTop: 12 },
    manualNoteInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.2)', borderRadius: 16, paddingHorizontal: 16, height: 44 },
    manualNoteInput: { flex: 1, color: '#FFFFFF', fontSize: 13, fontWeight: '500' },
    manualSelectorsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14 },
    manualSelectorPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#374151', gap: 6 },
    manualSelectorText: { fontSize: 13, fontWeight: '700', color: '#D1D5DB' },
    manualToggleRow: { alignItems: 'center', marginBottom: 14 },
    manualToggleContainer: { flexDirection: 'row', backgroundColor: '#1F2937', borderRadius: 20, padding: 4, width: 200 },
    manualToggleBtn: { flex: 1, flexDirection: 'row', gap: 6, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    manualToggleText: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
    manualToggleBtnActiveExpense: { backgroundColor: '#EF4444' },
    manualToggleBtnActiveIncome: { backgroundColor: '#10B981' },
    manualDateRow: { alignItems: 'center', marginBottom: 6 },
    manualNumpadWrapper: { marginTop: 'auto', marginBottom: 0, marginHorizontal: -16 },
    
    // Action Buttons
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 40, paddingBottom: 16, marginTop: 8 },
    actionRoundBtnContainer: { alignItems: 'center', justifyContent: 'flex-start', width: 64 },
    actionRoundBtnCancel: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#3F3F46' },
    actionRoundBtnText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },
    actionSaveBtnOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#3F3F46' },
    actionSaveBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#3F3F46', justifyContent: 'center', alignItems: 'center' },

    
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
