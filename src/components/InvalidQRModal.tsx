import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Colors } from '../utils/colors';
import { FONTS } from '../utils/storeData';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SPRING_CONFIG = {
    damping: 20,
    stiffness: 220,
    mass: 0.8,
};

type Props = {
    visible: boolean;
    message?: string;
    onScanAgain: () => void;
    onGoBack: () => void;
};

export default function InvalidQRModal({ visible, message, onScanAgain, onGoBack }: Props) {
    const { t } = useTranslation();

    const backdropOpacity = useSharedValue(0);
    const sheetScale = useSharedValue(0.88);
    const sheetOpacity = useSharedValue(0);
    const sheetTranslateY = useSharedValue(40);

    const show = useCallback(() => {
        backdropOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
        sheetScale.value = withSpring(1, SPRING_CONFIG);
        sheetOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        sheetTranslateY.value = withSpring(0, SPRING_CONFIG);
    }, []);

    const hide = useCallback((cb?: () => void) => {
        backdropOpacity.value = withTiming(0, { duration: 180 });
        sheetScale.value = withTiming(0.88, { duration: 180, easing: Easing.in(Easing.ease) });
        sheetOpacity.value = withTiming(0, { duration: 180 });
        sheetTranslateY.value = withTiming(40, { duration: 180, easing: Easing.in(Easing.ease) }, () => {
            if (cb) runOnJS(cb)();
        });
    }, []);

    useEffect(() => {
        if (visible) {
            show();
        } else {
            hide();
        }
    }, [visible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const sheetStyle = useAnimatedStyle(() => ({
        opacity: sheetOpacity.value,
        transform: [
            { scale: sheetScale.value },
            { translateY: sheetTranslateY.value },
        ] as any,
    }));

    if (!visible && sheetOpacity.value === 0) return null;

    const handleGoBack = () => {
        hide(onGoBack);
    };

    const handleScanAgain = () => {
        hide(onScanAgain);
    };

    return (
        <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
            <Animated.View style={[styles.backdrop, backdropStyle]}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleGoBack} />
            </Animated.View>

            <Animated.View style={[styles.sheet, sheetStyle]}>
                <View style={styles.iconContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="qr-code-outline" size={32} color={styles.iconColor.color} />
                        <View style={styles.iconBadge}>
                            <Ionicons name="close" size={12} color="#fff" />
                        </View>
                    </View>
                </View>

                <Text style={styles.title}>{t('Invalid QR Code')}</Text>
                <Text style={styles.message}>
                    {message ??
                        t('The QR code you scanned is not recognized or may be expired. Please try again with a valid code.')}
                </Text>

                <View style={styles.actions}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            pressed && styles.primaryBtnPressed,
                        ]}
                        onPress={handleScanAgain}
                        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
                    >
                        <Ionicons name="scan-outline" size={18} color="#fff" style={styles.btnIcon} />
                        <Text style={styles.primaryBtnText}>{t('Scan Again')}</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.secondaryBtn,
                            pressed && styles.secondaryBtnPressed,
                        ]}
                        onPress={handleGoBack}
                        android_ripple={{ color: 'rgba(0,0,0,0.06)', borderless: false }}
                    >
                        <Text style={styles.secondaryBtnText}>{t('Go Back')}</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.52)',
    },
    sheet: {
        width: SCREEN_WIDTH * 0.85,
        maxWidth: 340,
        backgroundColor: Colors.white,
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 28,
        alignItems: 'center',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    iconContainer: {
        marginBottom: 20,
        position: 'relative',
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FCEBEB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconColor: {
        color: '#A32D2D',
    },
    iconBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#E24B4A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.white,
    },
    title: {
        fontSize: 18,
        fontFamily: FONTS.LexendSemiBold,
        color: '#501313',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 13,
        fontFamily: FONTS.LexendRegular,
        color: '#888780',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
        paddingHorizontal: 4,
    },
    actions: {
        width: '100%',
        gap: 10,
    },
    primaryBtn: {
        height: 50,
        borderRadius: 10,
        backgroundColor: '#E24B4A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        overflow: 'hidden',
    },
    primaryBtnPressed: {
        backgroundColor: '#A32D2D',
    },
    btnIcon: {
        marginTop: 1,
    },
    primaryBtnText: {
        fontSize: 14,
        fontFamily: FONTS.LexendSemiBold,
        color: '#fff',
    },
    secondaryBtn: {
        height: 50,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    secondaryBtnPressed: {
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    secondaryBtnText: {
        fontSize: 14,
        fontFamily: FONTS.LexendMedium,
        color: '#444441',
    },
});