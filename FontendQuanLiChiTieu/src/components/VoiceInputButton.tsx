import React, { useState, useRef, useEffect } from 'react';
import {
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Animated,
    ActivityIndicator,
    Alert,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

// Lazy-load expo-speech-recognition to avoid crash in Expo Go
let ExpoSpeechRecognitionModule: any = null;
let useSpeechRecognitionEvent: any = null;
let speechModuleAvailable = false;

try {
    const mod = require('expo-speech-recognition');
    ExpoSpeechRecognitionModule = mod.ExpoSpeechRecognitionModule;
    useSpeechRecognitionEvent = mod.useSpeechRecognitionEvent;
    speechModuleAvailable = true;
} catch (e) {
    speechModuleAvailable = false;
}

interface VoiceInputButtonProps {
    onResult: (text: string) => void;
    disabled?: boolean;
}

// No-op hook for when the native module is not available
function useNoopEvent(_event: string, _handler: any) { }

export default function VoiceInputButton({ onResult, disabled }: VoiceInputButtonProps) {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const transcriptRef = useRef('');
    const isCancelled = useRef(false);

    // Pulse animation
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        if (isListening) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(pulseAnim, {
                            toValue: 1.5,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacityAnim, {
                            toValue: 0,
                            duration: 800,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(pulseAnim, {
                            toValue: 1,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                        Animated.timing(opacityAnim, {
                            toValue: 0.6,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
            opacityAnim.setValue(0.6);
        }
    }, [isListening]);

    // Use real or no-op event hooks based on availability
    const useEvent = speechModuleAvailable ? useSpeechRecognitionEvent : useNoopEvent;

    useEvent('start', () => {
        setIsListening(true);
        setTranscript('');
        transcriptRef.current = '';
        isCancelled.current = false;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    });

    useEvent('result', (event: any) => {
        const text = event.results[0]?.transcript || '';
        setTranscript(text);
        transcriptRef.current = text;
    });

    useEvent('end', () => {
        setIsListening(false);
        setIsProcessing(false);
        if (!isCancelled.current && transcriptRef.current) {
            const finalResult = transcriptRef.current;
            transcriptRef.current = '';
            setTranscript('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onResult(finalResult);
        }
    });

    useEvent('error', (event: any) => {
        setIsListening(false);
        setIsProcessing(false);
        console.log('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            Alert.alert(
                'Không có quyền',
                'Vui lòng cấp quyền micro và nhận diện giọng nói trong Cài đặt.',
            );
        }
    });

    const handlePress = async () => {
        if (disabled) return;

        if (!speechModuleAvailable) {
            Alert.alert(
                'Cần Development Build',
                'Tính năng nhập giọng nói không hỗ trợ trong Expo Go. Vui lòng sử dụng development build (npx expo run:android hoặc npx expo run:ios).',
            );
            return;
        }

        if (isListening) {
            // Fast skip: if user stops manually, we trigger end soon
            ExpoSpeechRecognitionModule.stop();
            return;
        }

        // Request permissions
        const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!granted) {
            Alert.alert(
                'Cần quyền truy cập',
                'Vui lòng cấp quyền micro và nhận diện giọng nói để sử dụng tính năng nhập bằng giọng nói.',
            );
            return;
        }

        setIsProcessing(true);

        ExpoSpeechRecognitionModule.start({
            lang: 'vi-VN',
            interimResults: true,
            maxAlternatives: 1,
            continuous: false, // Ensure it stops when user stops talking or manually
        });
    };

    const handleCancel = () => {
        isCancelled.current = true;
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        setIsProcessing(false);
        setTranscript('');
        transcriptRef.current = '';
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    };

    const getButtonColor = () => {
        if (disabled) return '#D1D5DB';
        if (isListening) return '#EF4444';
        return '#4F46E5';
    };

    const getButtonBg = () => {
        if (disabled) return '#F3F4F6';
        if (isListening) return '#FEE2E2';
        return '#EEF2FF';
    };

    return (
        <View style={styles.container}>
            {/* Transcript preview */}
            {isListening && transcript ? (
                <View style={styles.transcriptBubble}>
                    <Text style={styles.transcriptText} numberOfLines={2}>
                        {transcript}
                    </Text>
                </View>
            ) : null}

            <View style={styles.controlsRow}>
                {isListening && (
                    <TouchableOpacity
                        style={[styles.sideButton, styles.cancelButton]}
                        onPress={handleCancel}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                    >
                        <Ionicons name="close" size={24} color="#EF4444" />
                        <Text style={styles.sideLabel}>Hủy</Text>
                    </TouchableOpacity>
                )}

                {/* Button with pulse ring */}
                <View style={styles.buttonWrapper}>
                    {isListening && (
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.pulseRing,
                                {
                                    transform: [{ scale: pulseAnim }],
                                    opacity: opacityAnim,
                                    backgroundColor: '#EF4444',
                                },
                            ]}
                        />
                    )}
                    <TouchableOpacity
                        style={[
                            styles.micButton,
                            { backgroundColor: getButtonBg(), borderColor: getButtonColor() + '40' },
                        ]}
                        onPress={handlePress}
                        disabled={disabled || isProcessing}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        {isProcessing && !isListening ? (
                            <ActivityIndicator size="small" color={getButtonColor()} />
                        ) : (
                            <Ionicons
                                name={isListening ? 'stop' : 'mic'}
                                size={22}
                                color={getButtonColor()}
                            />
                        )}
                    </TouchableOpacity>
                    {isListening && <Text style={styles.mainLabel}>Lưu</Text>}
                </View>
            </View>

            {/* Default Label when not listening */}
            {!isListening && (
                <Text style={styles.label}>
                    Giọng nói
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonWrapper: {
        width: 52,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseRing: {
        position: 'absolute',
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    micButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    transcriptBubble: {
        position: 'absolute',
        bottom: 72,
        backgroundColor: '#1F2937',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        maxWidth: 200,
        minWidth: 80,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },
    transcriptText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        color: '#6B7280'
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sideButton: {
        marginRight: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FEE2E2',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    cancelButton: {
        // Just identification
    },
    sideLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
        position: 'absolute',
        bottom: -18,
    },
    mainLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#4F46E5',
        position: 'absolute',
        bottom: -18,
    }
});
