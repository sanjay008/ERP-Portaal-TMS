import { Images } from '@/src/assets/images';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import {
  isDescriptionOptional,
  shouldShowDamageInCommentModal,
} from '@/src/utils/parcelCommentRules';
import { GlobalContextData } from '@/src/context/GlobalContext';
import CheckBox from '@react-native-community/checkbox';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  userData: any;
  itemsData: any;
  selectCurrentDeliveryLabel: any;
  allDamageListReason: any[];
  selectDamageData: any;
  setselectDamageData: (value: any) => void;
  description: string;
  setDescription: (value: string) => void;
  commentError: string;
  commentLoader: boolean;
  isCommentOptional?: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

export default function ParcelVerifyCommentModal({
  visible,
  userData,
  itemsData,
  selectCurrentDeliveryLabel,
  allDamageListReason,
  selectDamageData,
  setselectDamageData,
  description,
  setDescription,
  commentError,
  commentLoader,
  isCommentOptional: _isCommentOptionalProp,
  onSubmit,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const { EffectiveDeliveryLabel, PinnedDeliveryLabel } =
    useContext(GlobalContextData);

  // Global pin is source of truth — survives Filter soft-null races.
  const resolvedLabel =
    EffectiveDeliveryLabel ??
    PinnedDeliveryLabel ??
    selectCurrentDeliveryLabel;

  const isCommentOptional = isDescriptionOptional(
    resolvedLabel,
    selectDamageData,
    itemsData,
  );

  const showDamageList = shouldShowDamageInCommentModal(
    resolvedLabel ?? selectCurrentDeliveryLabel,
    itemsData,
  );

  const displayName =
    userData?.user?.username?.length > 0
      ? userData?.user?.username
      : userData?.relaties?.display_name ?? '';

  return (
    <Modal
      isVisible={visible}
      style={{ margin: 0 }}
      animationIn="bounceInUp"
      animationOut="bounceOutDown"
      propagateSwipe
      avoidKeyboard={false}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
    >
      <View style={{ flex: 1 }}>
        <SafeAreaView />
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          enableOnAndroid
          extraHeight={200}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.commentBox}>
            <View>
              <Text style={styles.labelText}>{t('Name')}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.input}
                  editable={false}
                  placeholderTextColor={Colors.darkText}
                  placeholder={t('Enter your name')}
                  value={displayName}
                />
                <Image source={Images.user} style={styles.userIcon} />
              </View>
            </View>

            {showDamageList && allDamageListReason?.length > 0 && (
              <FlatList
                data={allDamageListReason}
                style={styles.cardWhite}
                scrollEnabled={false}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setselectDamageData(item);
                    }}
                    style={[
                      styles.damageRow,
                      { backgroundColor: item?.color || Colors.Boxgray },
                    ]}
                  >
                    <CheckBox
                      onValueChange={() => setselectDamageData(item)}
                      value={selectDamageData?.id === item?.id}
                      tintColors={{ true: Colors.white, false: Colors.white }}
                      tintColor={Colors.white}
                      onTintColor={Colors.white}
                      onCheckColor={Colors.white}
                      onFillColor={item?.color || Colors.Boxgray}
                    />
                    <Text style={styles.damageText}>{t(item?.title)}</Text>
                  </Pressable>
                )}
              />
            )}

            <View style={styles.descriptionSection}>
              <Text style={styles.labelText}>
                {t('Description')}
                {isCommentOptional ? ` (${t('optional')})` : ''}
              </Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder={t('Type here...')}
                multiline
                placeholderTextColor={Colors.black}
                numberOfLines={3}
                textAlignVertical="top"
              />
              {commentError ? <Text style={styles.error}>{commentError}</Text> : null}
            </View>

            <TouchableOpacity
              style={styles.buttonSubmit}
              disabled={commentLoader}
              onPress={onSubmit}
            >
              {commentLoader ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={[styles.labelText, { color: Colors.white }]}>
                  {t('Submit')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Colors.green,
  },
  commentBox: {
    width: '90%',
    padding: 15,
    marginHorizontal: 'auto',
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingBottom: 20,
  },
  labelText: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  inputBox: {
    width: '100%',
    backgroundColor: Colors.white,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'android' ? 5 : 10,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  input: {
    width: '80%',
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.black,
  },
  userIcon: {
    width: 18,
    height: 18,
  },
  cardWhite: {
    backgroundColor: Colors.white,
    marginTop: 10,
    borderRadius: 4,
    padding: 10,
  },
  damageRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginBottom: 10,
  },
  damageText: {
    fontSize: 14,
    fontFamily: FONTS.Medium,
    color: Colors.white,
  },
  descriptionSection: {
    marginTop: 5,
  },
  textArea: {
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    backgroundColor: Colors.white,
    minHeight: 150,
    maxHeight: 210,
    fontFamily: FONTS.Regular,
    color: Colors.black,
    marginTop: 10,
  },
  buttonSubmit: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15,
    marginTop: 25,
  },
  error: {
    fontSize: 13,
    color: Colors.red,
    fontFamily: FONTS.Regular,
    marginTop: 10,
    marginLeft: 5,
  },
});
