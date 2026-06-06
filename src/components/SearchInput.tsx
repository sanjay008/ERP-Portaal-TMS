import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    Platform,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    View,
    ViewStyle
} from 'react-native';
import { Colors } from '../utils/colors';
import { FONTS } from '../utils/storeData';

type OrderItem = {
    id: number;
    display_name: string;
    external_order_id?: string | null;
    [key: string]: any;
};

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
    value: string;
    setValue: (text: string) => void;
    suggestions: OrderItem[];
    onSelect?: (item: OrderItem) => void;
    containerStyle?: StyleProp<ViewStyle>;
};

export default function SearchInput({ value, setValue, suggestions, onSelect, containerStyle, ...rest }: Props) {
    const [focused, setFocused] = useState(false);
    const [showDrop, setShowDrop] = useState(false);

    useEffect(() => {
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                setShowDrop(false);
                setFocused(false);
            }
        );
        return () => hideSub.remove();
    }, []);

    const filtered = value.trim().length > 0
        ? suggestions.filter(s =>
            String(s.id).includes(value) ||
            s.display_name.toLowerCase().includes(value.toLowerCase())
          )
        : suggestions;

    const handleFocus = () => {
        setFocused(true);
        setShowDrop(true);
    };

    const handleBlur = () => {
        setFocused(false);
        setShowDrop(false);
    };

    const handleSelect = (item: OrderItem) => {
        setValue(`#${item.id} ${item.display_name}`);
        setShowDrop(false);
        setFocused(false);
        onSelect?.(item);
    };

    const handleClear = () => {
        setValue('');
        setShowDrop(true);
    };

    return (
        <View style={[styles.wrapper, containerStyle]}>
            <View style={[styles.container, focused && styles.containerFocused]}>
                <Ionicons
                    name="search-outline"
                    size={20}
                    color={focused ? Colors.primary : Colors.inActive}
                />
                <TextInput
                    value={value}
                    onChangeText={(text) => {
                        setValue(text);
                        setShowDrop(true);
                    }}
                    style={styles.input}
                    placeholderTextColor={Colors.inActive}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                    clearButtonMode="never"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...rest}
                />
                {value.length > 0 && (
                    <Pressable
                        onPress={handleClear}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={({ pressed }) => [pressed && styles.clearBtnPressed]}
                    >
                        <Ionicons name="close-circle" size={18} color={Colors.inActive} />
                    </Pressable>
                )}
            </View>

            {showDrop && filtered.length > 0 && (
                <View style={styles.dropdown}>
                    <ScrollView
                        style={styles.dropScroll}
                        bounces={false}
                        keyboardShouldPersistTaps="handled"
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                    >
                        {filtered.map((item, index) => (
                            <View key={String(item.id)}>
                                <Pressable
                                    onPress={() => handleSelect(item)}
                                    style={({ pressed }) => [
                                        styles.dropItem,
                                        pressed && styles.dropItemPressed,
                                    ]}
                                >
                                    <Text style={styles.dropId}>#{item.id}</Text>
                                    <Text style={styles.dropText} numberOfLines={1} ellipsizeMode="tail">
                                        {item.display_name}
                                    </Text>
                                    {item.external_order_id != null && (
                                        <Text style={styles.dropOrderId} numberOfLines={1} ellipsizeMode="tail">
                                            #{item.external_order_id}
                                        </Text>
                                    )}
                                </Pressable>
                                {index < filtered.length - 1 && (
                                    <View style={styles.separator} />
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        zIndex: 999,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 0.5,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        backgroundColor: Colors.white,
        gap: 8,
    },
    containerFocused: {
        borderColor: Colors.primary,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 14,
        fontFamily: FONTS.Regular,
        color: Colors.black,
        padding: 0,
        margin: 0,
        paddingVertical: Platform.OS === 'android' ? 15 : 12,
    },
    clearBtnPressed: {
        opacity: 0.5,
    },
    dropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 4,
        backgroundColor: Colors.white,
        borderRadius: 10,
        borderWidth: 0.5,
        borderColor: Colors.border,
        maxHeight: 220,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    dropScroll: {
        borderRadius: 10,
        maxHeight: 220,
    },
    dropItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
        gap: 8,
    },
    dropItemPressed: {
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    dropId: {
        fontSize: 13,
        fontFamily: FONTS.SemiBold,
        color: Colors.primary,
        flexShrink: 0,
    },
    dropText: {
        flex: 1,
        fontSize: 13,
        fontFamily: FONTS.Regular,
        color: Colors.black,
    },
    dropOrderId: {
        fontSize: 12,
        fontFamily: FONTS.Regular,
        color: Colors.inActive,
        flexShrink: 0,
    },
    separator: {
        height: 0.5,
        backgroundColor: Colors.border,
        marginHorizontal: 14,
    },
});