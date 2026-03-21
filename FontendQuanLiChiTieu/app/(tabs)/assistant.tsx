import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    TextInput, FlatList, KeyboardAvoidingView, Platform,
    ActivityIndicator, Animated, Image, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CategoryService, CategoryResponse } from '@/services/category.service';
import { WalletService, WalletResponse } from '@/services/wallet.service';
import { TransactionService, TransactionRequest } from '@/services/transaction.service';
import { parseVoiceTransaction } from '@/utils/parseVoiceTransaction';
import { AiService } from '@/services/ai.service';
import VoiceInputButton from '@/components/VoiceInputButton';

const { width } = Dimensions.get('window');

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    isTransaction?: boolean;
    txData?: any;
    status?: 'pending' | 'success' | 'error';
    image?: string;
}

export default function AssistantScreen() {
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: 'Xin chào! Tôi là trợ lý tài chính của bạn. Bạn vừa chi tiêu gì đó hay mới nhận được khoản tiền nào vậy? Hãy nói hoặc nhắn tin cho tôi nhé! 👋',
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [categories, setCategories] = useState<CategoryResponse[]>([]);
    const [wallets, setWallets] = useState<WalletResponse[]>([]);
    const isProcessing = useRef(false);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            const [cRes, wRes] = await Promise.all([
                CategoryService.getMyCategories('EXPENSE'),
                WalletService.getMyWallets()
            ]);
            // Also fetch INCOME categories to have a full list for parsing
            const incomeCats = await CategoryService.getMyCategories('INCOME');
            setCategories([...(cRes || []), ...(incomeCats || [])]);
            setWallets(wRes || []);
        } catch (error) {
            console.log('Error loading assistant data', error);
        }
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
        isProcessing.current = true;

        setIsTyping(true);

        let parsed: any; // Declare parsed here

        try {
            const categoryNames = categories.map(c => c.name);
            if (isImage && base64) {
                parsed = await AiService.scanReceipt(base64, mime || 'image/jpeg', categoryNames);
            } else {
                try {
                    // Try AI First
                    parsed = await AiService.chat(text, categoryNames);
                } catch (e) {
                    console.log('AI Chat failed, falling back to regex', e);
                    // Fallback to local regex
                    const regexParsed = parseVoiceTransaction(text, categories);
                    parsed = {
                        ...regexParsed,
                        category: regexParsed.categoryName || regexParsed.suggestedCategoryName
                    };
                }
            }

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
                                initialType: parsed.type // Pass the type filter here
                            }
                        });
                    }, 1500);
                    return;
                }

                addMessage({
                    sender: 'bot',
                    text: `Đã hiểu! Tôi đang mở báo cáo ${viewMode === 'monthly' ? `Tháng ${m}/${y}` : `Năm ${y}`} cho bạn xem nhé. 📊`
                });

                // Small delay to let user see message before navigation
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

                // If we only have category name from AI, find the ID
                if (!finalCategoryId && parsed.category) {
                    const matched = categories.find(c => c.name.toLowerCase() === (parsed.category as string).toLowerCase());
                    if (matched) finalCategoryId = matched.id;
                }
                // Verify category type match
                if (finalCategoryId) {
                    const matchedCat = categories.find(c => c.id === finalCategoryId);
                    if (matchedCat && matchedCat.type !== targetType) {
                        // Type mismatch! Try to find a category with same name but correct type
                        const correctTypeCat = categories.find(c =>
                            c.name.toLowerCase() === matchedCat.name.toLowerCase() &&
                            c.type === targetType
                        );
                        if (correctTypeCat) {
                            finalCategoryId = correctTypeCat.id;
                        } else {
                            // No correct type match found, force creation of a new one
                            finalCategoryId = null;
                            parsed.suggestedCategoryName = matchedCat.name;
                        }
                    }
                }

                // Handle category creation if needed
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
                    // Update local categories
                    setCategories(prev => [...prev, newCat]);
                }

                if (finalCategoryId && wallets.length > 0) {
                    // Decide wallet based on intent
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
                    return; // EXIT HERE
                }
            }

            // If we reached here, it means we couldn't parse or process enough info
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
        // Cần cấp quyền camera trước khi sử dụng
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
                        <Ionicons name="sparkles" size={16} color="#fff" />
                    </View>
                )}
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                    {item.image && (
                        <Image source={{ uri: item.image }} style={styles.messageImage} resizeMode="cover" />
                    )}
                    <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.botMessageText]}>
                        {item.text}
                    </Text>

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
                                    {new Intl.NumberFormat('vi-VN').format(item.txData.amount || 0)}đ
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

                    <Text style={styles.timestamp}>
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={26} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Trợ lý AI</Text>
                    <View style={styles.onlineBadge}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Đang hoạt động</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.headerIconBtn}>
                    <Ionicons name="ellipsis-horizontal" size={24} color="#111827" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.chatArea}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
            >
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
                        <ActivityIndicator size="small" color="#4F46E5" />
                        <Text style={styles.typingText}>Trợ lý đang xử lý...</Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={styles.inputContainer}>
                    <View style={styles.mediaActionsContainer}>
                        <TouchableOpacity style={styles.imageAttachBtn} onPress={handleTakeImage}>
                            <Ionicons name="camera-outline" size={22} color="#4F46E5" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.imageAttachBtn} onPress={handlePickImage}>
                            <Ionicons name="image-outline" size={22} color="#4F46E5" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Nhắn tin cho Trợ lý..."
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
                        >
                            <Ionicons name="send" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.voiceWrapper}>
                        <VoiceInputButton
                            onResult={handleVoiceResult}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerIconBtn: { padding: 8 },
    headerTitleContainer: { flex: 1, marginLeft: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
    onlineText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

    chatArea: { flex: 1 },
    messageList: { padding: 16, paddingBottom: 20 },
    messageContainer: { flex: 1, marginBottom: 16, maxWidth: '85%', flexDirection: 'row' },
    userMessageContainer: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
    botMessageContainer: { alignSelf: 'flex-start', justifyContent: 'flex-start' },

    botAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center',
        marginRight: 8, marginTop: 4
    },

    messageBubble: { padding: 12, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    userBubble: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
    botBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#F3F4F6' },

    messageText: { fontSize: 15, lineHeight: 22 },
    messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
    userMessageText: { color: '#fff' },
    botMessageText: { color: '#1F2937' },

    timestamp: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4, opacity: 0.6 },

    typingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    typingText: { fontSize: 13, color: '#6B7280', marginLeft: 8, fontStyle: 'italic' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 20 : 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        gap: 6
    },
    mediaActionsContainer: {
        flexDirection: 'row',
        gap: 6
    },
    imageAttachBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputWrapper: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 24,
        paddingLeft: 16,
        paddingRight: 6,
        paddingVertical: 6,
        alignItems: 'center',
    },
    input: { flex: 1, fontSize: 15, color: '#1F2937', paddingVertical: 8, maxHeight: 100 },
    sendBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center',
        marginLeft: 8
    },
    sendBtnDisabled: { backgroundColor: '#9CA3AF' },
    voiceWrapper: { marginLeft: 12 },

    /* Transaction Summary Card in Chat */
    txSummary: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    txHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    txTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    txLabel: { fontSize: 12, color: '#6B7280' },
    txValue: { fontSize: 12, fontWeight: '600', color: '#111827' }
});
