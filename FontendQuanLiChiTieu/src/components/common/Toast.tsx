import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Animated, TouchableOpacity,
    Platform, Dimensions, Modal, Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ─────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface ToastConfig {
    type: ToastType;
    title: string;
    message?: string;
    duration?: number; // ms, 0 = stay until dismissed
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface ToastContextValue {
    toast: (config: ToastConfig) => void;
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    confirm: (title: string, message: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
}

// ─── Context ────────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Toast Configs ──────────────────────────────────────────────────────────────
const TOAST_STYLES: Record<ToastType, { icon: string; color: string; bg: string; border: string; emoji: string }> = {
    success: { icon: 'checkmark-circle', color: '#065F46', bg: '#ECFDF5', border: '#34D399', emoji: '✅' },
    error:   { icon: 'close-circle',     color: '#991B1B', bg: '#FEF2F2', border: '#F87171', emoji: '❌' },
    warning: { icon: 'warning',          color: '#92400E', bg: '#FFFBEB', border: '#FCD34D', emoji: '⚠️' },
    info:    { icon: 'information-circle',color: '#1E40AF', bg: '#EFF6FF', border: '#60A5FA', emoji: 'ℹ️' },
    confirm: { icon: 'help-circle',      color: '#5B21B6', bg: '#F5F3FF', border: '#A78BFA', emoji: '🤔' },
};

// ─── Provider Component ──────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toastConfig, setToastConfig] = useState<ToastConfig | null>(null);
    const [visible, setVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(-120)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const showToast = useCallback((config: ToastConfig) => {
        if (timerRef.current) clearTimeout(timerRef.current);

        // For confirm dialogs use modal approach
        if (config.type === 'confirm') {
            setToastConfig(config);
            setVisible(true);
            return;
        }

        setToastConfig(config);
        setVisible(true);

        // Animate in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 8,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();

        const duration = config.duration ?? 3000;
        if (duration > 0) {
            timerRef.current = setTimeout(() => {
                hideToast();
            }, duration);
        }
    }, []);

    const hideToast = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -120,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            setToastConfig(null);
            slideAnim.setValue(-120);
            opacityAnim.setValue(0);
        });
    }, []);

    const contextValue: ToastContextValue = {
        toast: showToast,
        success: (title, message, duration) => showToast({ type: 'success', title, message, duration }),
        error:   (title, message, duration) => showToast({ type: 'error',   title, message, duration }),
        warning: (title, message, duration) => showToast({ type: 'warning', title, message, duration }),
        info:    (title, message, duration) => showToast({ type: 'info',    title, message, duration }),
        confirm: (title, message, onConfirm, confirmText = 'Xác nhận', cancelText = 'Hủy') =>
            showToast({ type: 'confirm', title, message, onConfirm, confirmText, cancelText, duration: 0 }),
    };

    const cfg = toastConfig ? TOAST_STYLES[toastConfig.type] : null;

    return (
        <ToastContext.Provider value={contextValue}>
            {children}

            {/* Confirm Modal */}
            {toastConfig?.type === 'confirm' && (
                <Modal
                    visible={visible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => {
                        setVisible(false);
                        setToastConfig(null);
                    }}
                >
                    <Pressable
                        style={styles.confirmOverlay}
                        onPress={() => {
                            setVisible(false);
                            setToastConfig(null);
                        }}
                    >
                        <Pressable style={styles.confirmBox} onPress={() => {}}>
                            <View style={[styles.confirmIconWrapper, { backgroundColor: cfg?.bg }]}>
                                <Text style={styles.confirmEmoji}>{cfg?.emoji}</Text>
                            </View>
                            <Text style={styles.confirmTitle}>{toastConfig.title}</Text>
                            {toastConfig.message && (
                                <Text style={styles.confirmMessage}>{toastConfig.message}</Text>
                            )}
                            <View style={styles.confirmBtnRow}>
                                <TouchableOpacity
                                    style={styles.confirmCancelBtn}
                                    onPress={() => {
                                        setVisible(false);
                                        setToastConfig(null);
                                    }}
                                >
                                    <Text style={styles.confirmCancelText}>{toastConfig.cancelText || 'Hủy'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.confirmOkBtn, { backgroundColor: cfg?.color }]}
                                    onPress={() => {
                                        toastConfig.onConfirm?.();
                                        setVisible(false);
                                        setToastConfig(null);
                                    }}
                                >
                                    <Text style={styles.confirmOkText}>{toastConfig.confirmText || 'Xác nhận'}</Text>
                                </TouchableOpacity>
                            </View>
                        </Pressable>
                    </Pressable>
                </Modal>
            )}

            {/* Banner Toast */}
            {toastConfig && toastConfig.type !== 'confirm' && visible && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            opacity: opacityAnim,
                            backgroundColor: cfg?.bg,
                            borderColor: cfg?.border,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={[styles.toastAccent, { backgroundColor: cfg?.border }]} />
                    <View style={styles.toastIconArea}>
                        <Text style={styles.toastEmoji}>{cfg?.emoji}</Text>
                    </View>
                    <View style={styles.toastTextArea}>
                        <Text style={[styles.toastTitle, { color: cfg?.color }]}>{toastConfig.title}</Text>
                        {toastConfig.message && (
                            <Text style={styles.toastMessage}>{toastConfig.message}</Text>
                        )}
                    </View>
                    <TouchableOpacity onPress={hideToast} style={styles.toastClose}>
                        <Ionicons name="close" size={16} color={cfg?.color} />
                    </TouchableOpacity>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
    return ctx;
}

// ─── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Banner Toast
    toastContainer: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 56 : 60,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 18,
        borderWidth: 1.5,
        paddingVertical: 14,
        paddingHorizontal: 14,
        zIndex: 99999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 20,
        overflow: 'hidden',
    },
    toastAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        borderTopLeftRadius: 18,
        borderBottomLeftRadius: 18,
    },
    toastIconArea: {
        marginLeft: 8,
        marginRight: 10,
    },
    toastEmoji: {
        fontSize: 22,
    },
    toastTextArea: {
        flex: 1,
    },
    toastTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 2,
    },
    toastMessage: {
        fontSize: 12,
        color: '#4B5563',
        lineHeight: 16,
    },
    toastClose: {
        padding: 4,
        marginLeft: 8,
    },

    // Confirm Dialog
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    confirmBox: {
        backgroundColor: '#fff',
        borderRadius: 28,
        padding: 28,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 15,
    },
    confirmIconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    confirmEmoji: {
        fontSize: 32,
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 13,
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 24,
    },
    confirmBtnRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    confirmCancelText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#4B5563',
    },
    confirmOkBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    confirmOkText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
    },
});
