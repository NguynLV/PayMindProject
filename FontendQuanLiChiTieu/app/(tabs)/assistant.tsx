import React, { useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, FlatList, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image, Dimensions, StatusBar, Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { TransactionService, TransactionRequest } from '@/services/transaction.service';
import { parseVoiceTransaction } from '@/utils/parseVoiceTransaction';
import { AiService } from '@/services/ai.service';
import VoiceInputButton from '@/components/VoiceInputButton';
import UserService, { UserProfile } from '@/services/user.service';
import { AiLimitService } from '@/utils/aiLimit';

const { width } = Dimensions.get('window');

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    isTransaction?: boolean;
    isConfirmation?: boolean;
    txData?: any;
    status?: 'pending' | 'success' | 'error';
    image?: string;
}

const INITIAL_MESSAGES: Message[] = [
    {
        id: '1',
        text: 'Xin chào! Tôi là trợ lý tài chính của bạn. Bạn vừa chi tiêu gì đó hay mới nhận được khoản tiền nào vậy? Hãy nói hoặc nhắn tin cho tôi nhé! 👋',
        sender: 'bot',
        timestamp: new Date()
    }
];

export default function AssistantScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null);
    const isProcessing = useRef(false);
    const flatListRef = useRef<FlatList>(null);
    const [aiUsageCount, setAiUsageCount] = useState(0);
    const [showLimitModal, setShowLimitModal] = useState(false);

    const updateUsageStats = async (isPrem: boolean) => {
        const stats = await AiLimitService.getUsageStats(isPrem);
        setAiUsageCount(stats.count);
    };

    useFocusEffect(
        useCallback(() => {
            UserService.getMyProfile()
                .then(u => {
                    setUser(u);
                    updateUsageStats(!!u?.isPremium);
                })
                .catch(console.warn);
            loadInitialData();
        }, [])
    );

    const loadInitialData = async () => {
        try {
            const [cRes, wRes] = await Promise.all([
                CategoryService.getMyCategories('EXPENSE'),
                WalletService.getMyWallets()
            ]);
            const incomeCats = await CategoryService.getMyCategories('INCOME');
            setCategories([...(cRes || []), ...(incomeCats || [])]);
            setWallets(wRes || []);
        } catch (error) {
            console.log('Error loading assistant data', error);
        }
    };

    const handleConfirmTransaction = async (messageId: string, txData: any) => {
        if (confirmingMessageId) return;
        setConfirmingMessageId(messageId);

        try {
            let finalCategoryId = txData.categoryId;

            if (!finalCategoryId && txData.category) {
                const matched = categories.find(c => c.name.toLowerCase() === txData.category.toLowerCase());
                if (matched) {
                    finalCategoryId = matched.id;
                } else {
                    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
                    const newCatName = txData.category.trim();
                    const newCat = await CategoryService.createCategory({
                        name: newCatName.charAt(0).toUpperCase() + newCatName.slice(1),
                        icon: 'apps',
                        color: colors[Math.floor(Math.random() * colors.length)],
                        type: txData.type
                    });
                    finalCategoryId = newCat.id;
                    setCategories(prev => [...prev, newCat]);
                }
            }

            const req: TransactionRequest = {
                amount: txData.amount,
                type: txData.type,
                categoryId: finalCategoryId,
                walletId: txData.walletId || (wallets.length > 0 ? wallets[0].id : null),
                transactionDate: new Date().toISOString(),
                description: txData.description || 'Quét hóa đơn'
            };

            await TransactionService.createTransaction(req);

            setMessages(prev => prev.map(msg => {
                if (msg.id === messageId) {
                    return {
                        ...msg,
                        text: `Đã lưu giao dịch: ${txData.type === 'INCOME' ? 'Thu' : 'Chi'} ${new Intl.NumberFormat('vi-VN').format(txData.amount || 0)}đ vào mục "${txData.category}". ✅`,
                        isConfirmation: false,
                        isTransaction: true,
                        status: 'success',
                        txData: {
                            ...txData,
                            categoryId: finalCategoryId
                        }
                    };
                }
                return msg;
            }));
        } catch (error: any) {
            console.log('Error confirming transaction', error);
            const msg = error.response?.data?.message || error.message || 'Lỗi kết nối';
            alert(`Không thể lưu giao dịch: ${msg}`);
        } finally {
            setConfirmingMessageId(null);
        }
    };

    const handleCancelTransaction = (messageId: string) => {
        setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
                return {
                    ...msg,
                    text: `Đã hủy lưu giao dịch từ hóa đơn này. ❌`,
                    isConfirmation: false,
                    isTransaction: false,
                    txData: undefined,
                    status: 'error'
                };
            }
            return msg;
        }));
    };

    const addMessage = (msg: Omit<Message, 'timestamp' | 'id'>) => {
        const newMsg: Message = {
            ...msg,
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMsg]);
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const processMessage = async (text: string, isImage: boolean = false, base64?: string, mime?: string) => {
        if (isProcessing.current) return;

        const isPremiumUser = !!user?.isPremium;

        if (isImage && !isPremiumUser) {
            setIsTyping(true);
            isProcessing.current = true;
            setTimeout(() => {
                addMessage({
                    sender: 'bot',
                    text: 'Chào bạn! Tôi đã nhận được hình ảnh của bạn. Tuy nhiên, tính năng tự động quét hóa đơn bằng AI chỉ dành cho thành viên Premium. Vui lòng nâng cấp Premium để trải nghiệm nhé! 👑'
                });
                setIsTyping(false);
                isProcessing.current = false;
                setShowLimitModal(true);
            }, 800);
            return;
        }

        const stats = await AiLimitService.getUsageStats(isPremiumUser);
        if (!stats.allowed) {
            setShowLimitModal(true);
            return;
        }

        isProcessing.current = true;
        setIsTyping(true);

        let parsed: any;

        try {
            const categoryNames = categories.map(c => c.name);
            if (isImage && base64) {
                parsed = await AiService.scanReceipt(base64, mime || 'image/jpeg', categoryNames);
            } else {
                try {
                    parsed = await AiService.chat(text, categoryNames);
                } catch (e) {
                    console.log('AI Chat failed, falling back to regex', e);
                    const regexParsed = parseVoiceTransaction(text, categories);
                    parsed = {
                        ...regexParsed,
                        category: regexParsed.categoryName || regexParsed.suggestedCategoryName
                    };
                }
            }

            // Increment daily usage count
            const newCount = await AiLimitService.incrementUsage(isPremiumUser);
            setAiUsageCount(newCount);

            if (parsed.intent === 'REPORT' && parsed.reportParams) {
                const { viewMode, month, year, day } = parsed.reportParams || {};
                const now = new Date();
                const m = month || (now.getMonth() + 1);
                const y = year || now.getFullYear();
                const d = day || now.getDate();

                if (viewMode === 'daily') {
                    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const typeLabel = parsed.type === 'INCOME' ? 'khoản thu nhập' : (parsed.type === 'EXPENSE' ? 'khoản chi tiêu' : 'danh sách giao dịch');
                    addMessage({
                        sender: 'bot',
                        text: `Đã hiểu! Tôi đang mở ${typeLabel} ngày ${d}/${m}/${y} cho bạn xem nhé. 📊`
                    });
                    setTimeout(() => {
                        router.push({
                            pathname: '/transactions',
                            params: {
                                startDate: dateStr,
                                endDate: dateStr,
                                initialType: parsed.type
                            }
                        });
                    }, 1500);
                    return;
                }

                addMessage({
                    sender: 'bot',
                    text: `Đã hiểu! Tôi đang mở báo cáo ${viewMode === 'monthly' ? `Tháng ${m}/${y}` : `Năm ${y}`} cho bạn xem nhé. 📊`
                });

                setTimeout(() => {
                    router.push({
                        pathname: '/report',
                        params: { viewMode, month: m, year: y }
                    });
                }, 1500);
                return;
            }

            if (parsed.amount && (parsed.category || parsed.categoryId)) {
                const targetType = parsed.type || 'EXPENSE';
                let finalCategoryId = parsed.categoryId;

                if (!finalCategoryId && parsed.category) {
                    const matched = categories.find(c => c.name.toLowerCase() === (parsed.category as string).toLowerCase());
                    if (matched) finalCategoryId = matched.id;
                }
                if (finalCategoryId) {
                    const matchedCat = categories.find(c => c.id === finalCategoryId);
                    if (matchedCat && matchedCat.type !== targetType) {
                        const correctTypeCat = categories.find(c =>
                            c.name.toLowerCase() === matchedCat.name.toLowerCase() &&
                            c.type === targetType
                        );
                        if (correctTypeCat) {
                            finalCategoryId = correctTypeCat.id;
                        } else {
                            finalCategoryId = null;
                            parsed.suggestedCategoryName = matchedCat.name;
                        }
                    }
                }

                if (isImage) {
                    let walletId = wallets[0]?.id;
                    if (parsed.walletIntent === 'BANK') {
                        const bankWallet = wallets.find(w => w.name.toLowerCase().includes('ngân hàng') || w.name.toLowerCase().includes('bank') || w.name.toLowerCase().includes('thẻ'));
                        if (bankWallet) walletId = bankWallet.id;
                    } else if (parsed.walletIntent === 'CASH') {
                        const cashWallet = wallets.find(w => w.name.toLowerCase().includes('tiền mặt') || w.name.toLowerCase().includes('ví'));
                        if (cashWallet) walletId = cashWallet.id;
                    }
                    const walletName = wallets.find(w => w.id === walletId)?.name || wallets[0]?.name || '';

                    addMessage({
                        sender: 'bot',
                        text: 'Tôi đã quét được thông tin hóa đơn. Bạn hãy xác nhận xem thông tin dưới đây đã chính xác chưa nhé: 📝',
                        isConfirmation: true,
                        txData: {
                            type: targetType,
                            amount: parsed.amount,
                            category: parsed.category || parsed.suggestedCategoryName || parsed.categoryName,
                            categoryId: finalCategoryId,
                            walletId: walletId,
                            walletName: walletName,
                            description: parsed.description || 'Quét hóa đơn'
                        }
                    });
                    return;
                }

                if (!finalCategoryId && (parsed.category || parsed.suggestedCategoryName)) {
                    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', '#8B5CF6', '#EC4899'];
                    const newCatName = (parsed.category || parsed.suggestedCategoryName).trim();
                    const newCat = await CategoryService.createCategory({
                        name: newCatName.charAt(0).toUpperCase() + newCatName.slice(1),
                        icon: 'apps',
                        color: colors[Math.floor(Math.random() * colors.length)],
                        type: targetType
                    });
                    finalCategoryId = newCat.id;
                    setCategories(prev => [...prev, newCat]);
                }

                if (finalCategoryId && wallets.length > 0) {
                    let walletId = wallets[0].id;
                    if (parsed.walletIntent === 'BANK') {
                        const bankWallet = wallets.find(w => w.name.toLowerCase().includes('ngân hàng') || w.name.toLowerCase().includes('bank') || w.name.toLowerCase().includes('thẻ'));
                        if (bankWallet) walletId = bankWallet.id;
                    } else if (parsed.walletIntent === 'CASH') {
                        const cashWallet = wallets.find(w => w.name.toLowerCase().includes('tiền mặt') || w.name.toLowerCase().includes('ví'));
                        if (cashWallet) walletId = cashWallet.id;
                    }

                    const req: TransactionRequest = {
                        amount: parsed.amount,
                        type: targetType,
                        categoryId: finalCategoryId,
                        walletId: walletId,
                        transactionDate: new Date().toISOString(),
                        description: parsed.description || 'Giao dịch qua Trợ lý AI'
                    };

                    await TransactionService.createTransaction(req);

                    addMessage({
                        sender: 'bot',
                        text: `Đã hiểu! Tôi đã lưu giao dịch: ${parsed.type === 'INCOME' ? 'Thu' : 'Chi'} ${new Intl.NumberFormat('vi-VN').format(parsed.amount || 0)}đ vào mục "${parsed.category || parsed.categoryName || parsed.suggestedCategoryName}". ✅`,
                        isTransaction: true,
                        txData: { ...parsed, walletName: wallets.find(w => w.id === walletId)?.name || wallets[0].name },
                        status: 'success'
                    });
                    return;
                }
            }

            const errorDetail = parsed.error ? `\n(Lỗi: ${parsed.error})` : '';
            addMessage({
                sender: 'bot',
                text: isImage
                    ? `Xin lỗi, tôi không thể đọc được thông tin từ hóa đơn này.${errorDetail} Bạn hãy thử chụp lại rõ hơn hoặc nhập tay nhé!`
                    : `Xin lỗi, tôi chưa rõ số tiền hoặc hạng mục bạn muốn lưu.${errorDetail} Bạn có thể ví dụ: "Ăn sáng hết 30k" được không?`
            });
        } catch (error: any) {
            console.log('Error processing AI message', error);
            const msg = error.response?.data?.message || error.message || 'Lỗi kết nối';
            addMessage({
                sender: 'bot',
                text: `Có lỗi xảy ra khi tôi đang xử lý thông tin (${msg}). Bạn thử lại nhé!`
            });
        } finally {
            setIsTyping(false);
            isProcessing.current = false;
        }
    };

    const handleSend = () => {
        if (!inputText.trim()) return;

        const text = inputText.trim();
        setInputText('');
        addMessage({ sender: 'user', text });
        processMessage(text);
    };

    const handleVoiceResult = (text: string) => {
        if (!text.trim()) return;
        addMessage({ sender: 'user', text });
        processMessage(text);
    };

    const handleTakeImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            alert('Xin lỗi, chúng tôi cần quyền truy cập camera để thực hiện chức năng này!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
            const asset = result.assets[0];
            const base64Data = asset.base64 as string;
            addMessage({
                sender: 'user',
                text: 'Đã chụp một hóa đơn',
                image: asset.uri
            });
            processMessage('Receipt scan', true, base64Data, asset.mimeType || 'image/jpeg');
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            const asset = result.assets[0];
            const base64Data = asset.base64 as string;
            addMessage({
                sender: 'user',
                text: 'Đã tải lên một hóa đơn',
                image: asset.uri
            });
            processMessage('Receipt scan', true, base64Data, asset.mimeType || 'image/jpeg');
        }
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.botMessageContainer]}>
                {!isUser && (
                    <View style={styles.botAvatar}>
                        <Ionicons name="sparkles" size={14} color="#fff" />
                    </View>
                )}
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                    {item.image && (
                        <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
                    )}
                    <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
                        {item.text}
                    </Text>

                    {item.isConfirmation && item.txData && (
                        <View style={styles.txSummary}>
                            <View style={styles.txHeader}>
                                <Ionicons
                                    name={item.txData.type === 'INCOME' ? "add-circle" : "remove-circle"}
                                    size={18}
                                    color={item.txData.type === 'INCOME' ? "#10B981" : "#EF4444"}
                                />
                                <Text style={styles.txTitle}>Xác nhận hóa đơn</Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Số tiền:</Text>
                                <Text style={[styles.txValue, { color: item.txData.type === 'INCOME' ? "#10B981" : "#EF4444" }]}>
                                    {new Intl.NumberFormat('vi-VN').format(item.txData.amount || 0)} đ
                                </Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Danh mục:</Text>
                                <Text style={styles.txValue}>{item.txData.category || item.txData.categoryName || item.txData.suggestedCategoryName}</Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Ví:</Text>
                                <Text style={styles.txValue}>{item.txData.walletName}</Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Mô tả:</Text>
                                <Text style={styles.txValue} numberOfLines={1}>{item.txData.description}</Text>
                            </View>
                            <View style={styles.confirmButtonsRow}>
                                <TouchableOpacity 
                                    style={[styles.confirmBtn, styles.cancelBtn]} 
                                    onPress={() => handleCancelTransaction(item.id)}
                                    disabled={confirmingMessageId === item.id}
                                >
                                    <Text style={styles.cancelBtnText}>Hủy</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.confirmBtn, { backgroundColor: '#F3F4F6', flex: 0.8, borderColor: '#E5E7EB', borderWidth: 1 }]} 
                                    onPress={() => {
                                        handleCancelTransaction(item.id);
                                        router.push({
                                            pathname: '/(tabs)/add',
                                            params: {
                                                initialType: item.txData.type,
                                                amount: item.txData.amount?.toString(),
                                                categoryId: item.txData.categoryId?.toString(),
                                                categoryName: item.txData.category,
                                                walletId: item.txData.walletId?.toString(),
                                                description: item.txData.description
                                            }
                                        });
                                    }}
                                    disabled={confirmingMessageId === item.id}
                                >
                                    <Text style={[styles.cancelBtnText, { color: '#4B5563' }]}>Sửa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.confirmBtn, styles.okBtn]} 
                                    onPress={() => handleConfirmTransaction(item.id, item.txData)}
                                    disabled={confirmingMessageId === item.id}
                                >
                                    {confirmingMessageId === item.id ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text style={styles.okBtnText}>Xác nhận</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {item.isTransaction && item.txData && (
                        <View style={styles.txSummary}>
                            <View style={styles.txHeader}>
                                <Ionicons
                                    name={item.txData.type === 'INCOME' ? "add-circle" : "remove-circle"}
                                    size={18}
                                    color={item.txData.type === 'INCOME' ? "#10B981" : "#EF4444"}
                                />
                                <Text style={styles.txTitle}>Chi tiết giao dịch</Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Số tiền:</Text>
                                <Text style={[styles.txValue, { color: item.txData.type === 'INCOME' ? "#10B981" : "#EF4444" }]}>
                                    {new Intl.NumberFormat('vi-VN').format(item.txData.amount || 0)} đ
                                </Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Danh mục:</Text>
                                <Text style={styles.txValue}>{item.txData.category || item.txData.categoryName || item.txData.suggestedCategoryName}</Text>
                            </View>
                            <View style={styles.txRow}>
                                <Text style={styles.txLabel}>Ví:</Text>
                                <Text style={styles.txValue}>{item.txData.walletName}</Text>
                            </View>
                        </View>
                    )}

                    <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Redesigned Clean Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Trợ lý tài chính AI</Text>
                    <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Đang hoạt động</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.headerIconBtn}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#1F2937" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.chatArea}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
            >
                {/* Daily limit usage banner for Free users */}
                {user && !user.isPremium && (
                    <View style={styles.limitBanner}>
                        <View style={styles.limitBannerLeft}>
                            <Ionicons name="sparkles" size={14} color="#6366F1" />
                            <Text style={styles.limitBannerText}>
                                Bản miễn phí: {aiUsageCount}/3 tin nhắn hôm nay
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/premium')} style={styles.limitBannerBtn}>
                            <Text style={styles.limitBannerBtnText}>Nâng cấp Premium 👑</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.messageList}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {isTyping && (
                    <View style={styles.typingContainer}>
                        <ActivityIndicator size="small" color="#6366F1" />
                        <Text style={styles.typingText}>Trợ lý đang xử lý...</Text>
                    </View>
                )}

                {/* Redesigned Input Panel */}
                <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom + 4 : 12 }]}>
                    <View style={styles.mediaActionsContainer}>
                        <TouchableOpacity style={styles.imageAttachBtn} onPress={handleTakeImage} activeOpacity={0.7}>
                            <Ionicons name="camera" size={20} color="#6366F1" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.imageAttachBtn} onPress={handlePickImage} activeOpacity={0.7}>
                            <Ionicons name="image" size={20} color="#6366F1" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhập giao dịch hoặc nhắn tin..."
                            placeholderTextColor="#9CA3AF"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.voiceWrapper}>
                        <VoiceInputButton onResult={handleVoiceResult} />
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Daily Limit upgrade modal */}
            <Modal
                visible={showLimitModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLimitModal(false)}
            >
                <View style={styles.limitModalOverlay}>
                    <View style={styles.limitModalContent}>
                        <TouchableOpacity style={styles.limitModalClose} onPress={() => setShowLimitModal(false)}>
                            <Ionicons name="close" size={24} color="#4B5563" />
                        </TouchableOpacity>

                        <View style={styles.outerShellIcon}>
                            <View style={styles.innerShellIcon}>
                                <Ionicons name="sparkles" size={40} color="#6366F1" />
                            </View>
                        </View>

                        <Text style={styles.overlayTitle}>Đạt giới hạn hôm nay! 👑</Text>
                        <Text style={styles.overlayText}>
                            Bạn đã sử dụng hết 3 lượt chat hoặc quét hóa đơn AI miễn phí của ngày hôm nay. Nâng cấp lên Premium để tiếp tục sử dụng không giới hạn.
                        </Text>

                        <View style={styles.featureBenefits}>
                            <View style={styles.benefitCard}>
                                <View style={[styles.benefitIconBg, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="chatbubble-ellipses" size={20} color="#6366F1" />
                                </View>
                                <View style={styles.benefitTextCol}>
                                    <Text style={styles.benefitTitle}>Trò chuyện thông minh</Text>
                                    <Text style={styles.benefitDesc}>Nhập tin nhắn hoặc giọng nói để thêm giao dịch nhanh trong 2 giây.</Text>
                                </View>
                            </View>

                            <View style={styles.benefitCard}>
                                <View style={[styles.benefitIconBg, { backgroundColor: '#ECFDF5' }]}>
                                    <Ionicons name="scan" size={20} color="#10B981" />
                                </View>
                                <View style={styles.benefitTextCol}>
                                    <Text style={styles.benefitTitle}>Quét hóa đơn bằng Camera</Text>
                                    <Text style={styles.benefitDesc}>Tự động nhận diện số tiền, ngày mua và danh mục chi tiêu.</Text>
                                </View>
                            </View>

                            <View style={styles.benefitCard}>
                                <View style={[styles.benefitIconBg, { backgroundColor: '#FFFBEB' }]}>
                                    <Ionicons name="analytics" size={20} color="#F59E0B" />
                                </View>
                                <View style={styles.benefitTextCol}>
                                    <Text style={styles.benefitTitle}>Tư vấn chi tiêu cá nhân</Text>
                                    <Text style={styles.benefitDesc}>Đưa ra cảnh báo vượt ngân sách và lời khuyên tiết kiệm hàng tuần.</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.upgradeBtn}
                            onPress={() => {
                                setShowLimitModal(false);
                                router.push('/premium');
                            }}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.upgradeBtnText}>Mở khóa Premium ngay • 19,000 đ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB'
    },
    headerTitleContainer: { flex: 1, marginLeft: 12 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
    onlineText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

    chatArea: { flex: 1 },
    messageList: { padding: 16, paddingBottom: 24 },
    messageContainer: { marginBottom: 20, maxWidth: '85%', flexDirection: 'row' },
    userMessageContainer: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    botMessageContainer: { alignSelf: 'flex-start', justifyContent: 'flex-start' },

    botAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        alignSelf: 'flex-end',
        marginBottom: 6
    },

    messageBubble: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    userBubble: {
        backgroundColor: '#6366F1',
        borderBottomRightRadius: 4,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 1,
    },
    botBubble: {
        backgroundColor: '#F3F4F6',
        borderBottomLeftRadius: 4,
    },

    messageText: { fontSize: 14, lineHeight: 20 },
    messageImage: { width: 220, height: 160, borderRadius: 14, marginBottom: 8 },
    userMessageText: { color: '#FFFFFF', fontWeight: '500' },
    botMessageText: { color: '#1F2937', fontWeight: '500' },

    timestamp: { fontSize: 9, marginTop: 4, alignSelf: 'flex-end' },
    userTimestamp: { color: 'rgba(255, 255, 255, 0.7)' },
    botTimestamp: { color: '#9CA3AF' },

    typingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
    typingText: { fontSize: 12, color: '#6B7280', marginLeft: 8, fontStyle: 'italic' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 8
    },
    mediaActionsContainer: {
        flexDirection: 'row',
        gap: 6
    },
    imageAttachBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 22,
        paddingLeft: 14,
        paddingRight: 6,
        paddingVertical: 4,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: '#1F2937',
        paddingVertical: 8,
        maxHeight: 80,
    },
    sendBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: { backgroundColor: '#9CA3AF' },
    voiceWrapper: { marginLeft: 2 },

    /* Glassmorphic-Receipt Card */
    txSummary: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1
    },
    txHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
    txTitle: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    txLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
    txValue: { fontSize: 12, fontWeight: '700', color: '#111827', fontVariant: ['tabular-nums'] },
    confirmButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 10,
    },
    confirmBtn: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 74,
    },
    cancelBtn: {
        backgroundColor: '#F3F4F6',
    },
    cancelBtnText: {
        color: '#4B5563',
        fontSize: 12,
        fontWeight: '600',
    },
    okBtn: {
        backgroundColor: '#6366F1',
    },
    okBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },

    /* Premium Overlay UI */
    premiumOverlay: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    outerShellIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    innerShellIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 2,
    },
    overlayTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 8,
        textAlign: 'center',
    },
    overlayText: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 24,
        paddingHorizontal: 12,
    },
    featureBenefits: {
        width: '100%',
        gap: 12,
        marginBottom: 28,
    },
    benefitCard: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        alignItems: 'center',
    },
    benefitIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    benefitTextCol: {
        flex: 1,
    },
    benefitTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 2,
    },
    benefitDesc: {
        fontSize: 11,
        color: '#6B7280',
        lineHeight: 14,
    },
    upgradeBtn: {
        backgroundColor: '#6366F1',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
    },
    upgradeBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    limitBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F5F3FF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E7FF',
    },
    limitBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    limitBannerText: {
        fontSize: 12,
        color: '#4F46E5',
        fontWeight: '600',
    },
    limitBannerBtn: {
        backgroundColor: '#6366F1',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    limitBannerBtnText: {
        fontSize: 11,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    limitModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    limitModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        alignItems: 'center',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    limitModalClose: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },
});
