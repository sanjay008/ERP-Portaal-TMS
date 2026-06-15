import { GlobalContextData } from '@/src/context/GlobalContext';
import { Colors } from '@/src/utils/colors';
import {
  findCountryByCode,
  filterCountriesByQuery,
  filterCountriesWithCallingCode,
  getPhoneLengthRules,
  isPhoneLengthValid,
  MergedCountry,
  normalizePhoneForCountry,
} from '@/src/utils/countryListHelper';
import { FONTS } from '@/src/utils/storeData';
import { Ionicons } from '@expo/vector-icons';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';

const SEARCH_BAR_HEIGHT = 44;
const ROW_HEIGHT = 44;
const BOTTOM_INSET = 12;
const MIN_LIST_HEIGHT = ROW_HEIGHT * 3;
const MIN_DROPDOWN_HEIGHT = SEARCH_BAR_HEIGHT + MIN_LIST_HEIGHT;

type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DropdownLayout = {
  top: number;
  left: number;
  width: number;
  height: number;
  opensAbove: boolean;
};

const getPreferredMaxHeight = () => {
  const screenH = Dimensions.get('window').height;
  return Math.round(Math.min(Math.max(screenH * 0.42, 280), 400));
};

const computeDropdownLayout = (
  anchor: AnchorRect,
  keyboardHeight = 0,
): DropdownLayout => {
  const { height: screenH, width: screenW } = Dimensions.get('window');
  const preferredMax = getPreferredMaxHeight();
  const visibleBottom = screenH - keyboardHeight - BOTTOM_INSET;
  const spaceBelow = visibleBottom - (anchor.y + anchor.height);
  const spaceAbove = anchor.y - BOTTOM_INSET;

  let opensAbove = false;
  let height: number;
  let top: number;

  if (spaceBelow >= MIN_DROPDOWN_HEIGHT) {
    height = Math.min(preferredMax, spaceBelow);
    top = anchor.y + anchor.height;
  } else if (spaceAbove >= MIN_DROPDOWN_HEIGHT && spaceAbove > spaceBelow) {
    opensAbove = true;
    height = Math.min(preferredMax, spaceAbove);
    top = anchor.y - height;
  } else if (spaceBelow >= spaceAbove) {
    height = Math.max(MIN_DROPDOWN_HEIGHT, Math.min(preferredMax, spaceBelow));
    top = anchor.y + anchor.height;
  } else {
    opensAbove = true;
    height = Math.max(MIN_DROPDOWN_HEIGHT, Math.min(preferredMax, spaceAbove));
    top = Math.max(BOTTOM_INSET, anchor.y - height);
  }

  const horizontalInset = 8;
  const left = Math.max(
    horizontalInset,
    Math.min(anchor.x, screenW - anchor.width - horizontalInset),
  );
  const width = Math.min(anchor.width, screenW - left - horizontalInset);

  return { top, left, width, height, opensAbove };
};

type Props = {
  value?: string;
  setValue?: (text: string) => void;
  countryCode?: string;
  onSelect?: (country: MergedCountry) => void;
  onOpenChange?: (open: boolean) => void;
  ContainerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  showValidation?: boolean;
  placeholder?: string;
};

type ListItem = MergedCountry & { _showDivider?: boolean };

const CountryRow = React.memo(function CountryRow({
  item,
  isSelected,
  onPick,
}: {
  item: MergedCountry;
  isSelected: boolean;
  onPick: (country: MergedCountry) => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.dropdownRow,
        pressed && styles.dropdownRowPressed,
        isSelected && styles.dropdownRowActive,
      ]}
      onPress={() => onPick(item)}
    >
      <Text style={styles.rowFlag}>{item.flag}</Text>
      <Text style={styles.rowName} numberOfLines={1}>
        {item.name}
      </Text>
      {item.countrycode ? (
        <Text style={styles.rowCode}>+{item.countrycode}</Text>
      ) : null}
    </Pressable>
  );
});

export default function MyCountryPiker({
  value = '',
  setValue,
  countryCode = '31',
  onSelect,
  onOpenChange,
  ContainerStyle,
  inputStyle,
  disabled = false,
  showValidation = false,
  placeholder = 'Phone number',
}: Props) {
  const { t } = useTranslation();
  const { AllCountries, fetchCountries } = useContext(GlobalContextData);
  const [selected, setSelected] = useState<MergedCountry | null>(null);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownLayout, setDropdownLayout] = useState<DropdownLayout>({
    top: 0,
    left: 0,
    width: 0,
    height: getPreferredMaxHeight(),
    opensAbove: false,
  });
  const anchorRef = useRef<View>(null);
  const keyboardHeightRef = useRef(0);

  const updateDropdownLayout = useCallback((keyboardHeight = 0) => {
    keyboardHeightRef.current = keyboardHeight;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const anchor = { x, y, width, height };
      setDropdownLayout(computeDropdownLayout(anchor, keyboardHeight));
    });
  }, []);

  useEffect(() => {
    fetchCountries?.();
  }, [fetchCountries]);

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const phoneRules = useMemo(
    () => getPhoneLengthRules(selected?.countrycode ?? countryCode ?? '31'),
    [selected?.countrycode, countryCode],
  );

  const selectableCountries = useMemo(
    () => filterCountriesWithCallingCode(AllCountries ?? []),
    [AllCountries],
  );

  useEffect(() => {
    if (!selectableCountries.length) return;
    const match = findCountryByCode(selectableCountries, countryCode);
    if (match) setSelected(match);
  }, [selectableCountries, countryCode]);

  useEffect(() => {
    if (String(countryCode ?? '31') !== '31') return;
    if (String(value ?? '').trim() !== '') return;
    setValue?.('06');
  }, [countryCode, value, setValue]);

  const flatListData = useMemo((): ListItem[] => {
    if (!selectableCountries.length) return [];

    const trimmedSearch = searchQuery.trim();
    if (trimmedSearch) {
      return filterCountriesByQuery(selectableCountries, trimmedSearch).sort(
        (a, b) => {
          if (b.favorite !== a.favorite) return b.favorite - a.favorite;
          return a.name.localeCompare(b.name);
        },
      );
    }

    const favorites = selectableCountries.filter((c) => c.favorite === 1);
    const others = selectableCountries.filter((c) => c.favorite !== 1);

    if (others.length === 0) return favorites;
    if (favorites.length === 0) return others;

    return [
      ...favorites,
      ...others.map((item, index) => ({
        ...item,
        _showDivider: index === 0,
      })),
    ];
  }, [selectableCountries, searchQuery]);

  const openDropdown = useCallback(() => {
    if (disabled) return;

    setSearchQuery('');
    keyboardHeightRef.current = 0;
    anchorRef.current?.measureInWindow((x, y, width, height) => {
      const anchor = { x, y, width, height };
      setDropdownLayout(computeDropdownLayout(anchor, 0));
      setOpenState(true);
    });
  }, [disabled, setOpenState]);

  const closeDropdown = useCallback(() => {
    setSearchQuery('');
    keyboardHeightRef.current = 0;
    setOpenState(false);
  }, [setOpenState]);

  useEffect(() => {
    if (!open) return;

    const keyboardShowEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(keyboardShowEvent, (event) => {
      updateDropdownLayout(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(keyboardHideEvent, () => {
      updateDropdownLayout(0);
    });
    const dimensionSub = Dimensions.addEventListener('change', () => {
      updateDropdownLayout(keyboardHeightRef.current);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      dimensionSub.remove();
    };
  }, [open, updateDropdownLayout]);

  const toggleDropdown = useCallback(() => {
    if (open) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }, [open, closeDropdown, openDropdown]);

  const handlePick = useCallback(
    (country: MergedCountry) => {
      const newCode = String(country.countrycode);
      setSelected(country);
      onSelect?.(country);

      if (newCode === '31') {
        setValue?.('06');
      } else {
        const currentDigits = (value ?? '').replace(/\D/g, '');
        if (currentDigits === '06') {
          setValue?.('');
        } else {
          setValue?.(normalizePhoneForCountry(newCode, value ?? ''));
        }
      }
      closeDropdown();
    },
    [onSelect, closeDropdown, setValue, value],
  );

  const handlePhoneChange = useCallback(
    (text: string) => {
      const code = selected?.countrycode ?? countryCode ?? '31';
      setValue?.(normalizePhoneForCountry(String(code), text));
    },
    [selected?.countrycode, countryCode, setValue],
  );

  const isSelected = useCallback(
    (item: MergedCountry) =>
      selected?.countrycode === item.countrycode &&
      selected?.cca2 === item.cca2,
    [selected],
  );

  const renderFlatItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <View>
        {item._showDivider ? <View style={styles.dropdownDivider} /> : null}
        <CountryRow
          item={item}
          isSelected={isSelected(item)}
          onPick={handlePick}
        />
      </View>
    ),
    [handlePick, isSelected],
  );

  const keyExtractor = useCallback(
    (item: ListItem, index: number) =>
      `${item.apiId ?? item.cca2}-${item.countrycode}-${index}`,
    [],
  );

  const validationMessage = () => {
    if (!showValidation || !value) return null;
    const code = selected?.countrycode ?? countryCode;
    if (isPhoneLengthValid(code, value)) {
      return (
        <Text style={[styles.validationText, styles.validationOk]}>
          ✔ {t('Number length is valid')}
        </Text>
      );
    }
    const { min, max } = getPhoneLengthRules(code);
    if (min === max) {
      return (
        <Text style={[styles.validationText, styles.validationError]}>
          ✖ {t('Number should be')} {min} {t('digits')}
        </Text>
      );
    }
    return (
      <Text style={[styles.validationText, styles.validationError]}>
        ✖ {t('Number should be')} {min}-{max} {t('digits')}
      </Text>
    );
  };

  return (
    <>
      <View style={[styles.wrapper, ContainerStyle]}>
        <View
          ref={anchorRef}
          collapsable={false}
          style={styles.inputRow}
        >
          <Pressable
            disabled={disabled}
            style={styles.codeBtn}
            onPress={toggleDropdown}
          >
            <Text style={styles.flagText}>{selected?.flag ?? '🏳️'}</Text>
            <Text style={styles.callingCodeText}>
              +{selected?.countrycode ?? countryCode}
            </Text>
            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.black}
            />
          </Pressable>

          <TextInput
            key={`phone-input-${selected?.countrycode ?? countryCode}`}
            style={[styles.phoneInput, inputStyle]}
            value={value}
            onChangeText={handlePhoneChange}
            placeholder={placeholder}
            keyboardType="number-pad"
            editable={!disabled}
            maxLength={phoneRules.max}
            placeholderTextColor={Colors.textgray}
            onFocus={closeDropdown}
          />
        </View>

        {validationMessage()}
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDropdown}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeDropdown} />

          <View
            style={[
              styles.modalDropdown,
              dropdownLayout.opensAbove
                ? styles.modalDropdownAbove
                : styles.modalDropdownBelow,
              {
                top: dropdownLayout.top,
                left: dropdownLayout.left,
                width: dropdownLayout.width,
                height: dropdownLayout.height,
              },
            ]}
          >
            <View style={styles.searchBox}>
              <Ionicons
                name="search"
                size={16}
                color={Colors.textgray}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('Search country')}
                placeholderTextColor={Colors.textgray}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  style={styles.searchClearBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Colors.textgray}
                  />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={flatListData}
              keyExtractor={keyExtractor}
              renderItem={renderFlatItem}
              style={styles.dropdownList}
              contentContainerStyle={styles.dropdownListContent}
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator
              bounces
              scrollEventThrottle={16}
              initialNumToRender={14}
              maxToRenderPerBatch={18}
              windowSize={8}
              removeClippedSubviews={Platform.OS === 'android'}
              nestedScrollEnabled
              ListEmptyComponent={
                <Text style={styles.emptyText}>{t('No countries found')}</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 48,
    paddingHorizontal: 10,
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 10,
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: Colors.litegray,
    minHeight: 48,
  },
  flagText: {
    fontSize: 20,
  },
  callingCodeText: {
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
  },
  phoneInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    paddingVertical: 0,
    minHeight: 48,
  },
  modalRoot: {
    flex: 1,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  modalDropdown: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.litegray,
    overflow: 'hidden',
    elevation: 24,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalDropdownBelow: {
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  modalDropdownAbove: {
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SEARCH_BAR_HEIGHT,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.litegray,
    backgroundColor: Colors.white,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    paddingVertical: 0,
    height: SEARCH_BAR_HEIGHT,
  },
  searchClearBtn: {
    marginLeft: 6,
    padding: 2,
  },
  dropdownList: {
    flex: 1,
  },
  dropdownListContent: {
    paddingBottom: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ROW_HEIGHT,
    paddingHorizontal: 12,
    gap: 8,
    width: '100%',
  },
  dropdownRowPressed: {
    backgroundColor: Colors.BtnBg,
  },
  dropdownRowActive: {
    backgroundColor: Colors.litegray1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: Colors.litegray,
    marginHorizontal: 10,
  },
  rowFlag: {
    fontSize: 18,
    width: 28,
  },
  rowName: {
    flex: 1,
    fontSize: 14,
    fontFamily: FONTS.Regular,
    color: Colors.black,
  },
  rowCode: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.orderdark,
  },
  emptyText: {
    padding: 14,
    textAlign: 'center',
    color: Colors.textgray,
    fontFamily: FONTS.Regular,
  },
  validationText: {
    marginTop: 4,
    paddingHorizontal: 10,
    fontSize: 13,
    fontFamily: FONTS.Regular,
  },
  validationOk: {
    color: Colors.green,
  },
  validationError: {
    color: Colors.red,
  },
});
