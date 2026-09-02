import { Image } from 'expo-image';
import React, { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Modal,
  Pressable,
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import apiConstants from '../api/apiConstants';
import { Images } from '../assets/images';
import { GlobalContextData } from '../context/GlobalContext';
import ApiService from '../utils/Apiservice';
import { Colors } from '../utils/colors';
import { FONTS } from '../utils/storeData';

type Props = {
  index: number;
  data: any;
  qty?: number;
  title?: string;
  Icon?: string | null;
  statusData?: any;
  orderData?: any;
  backOrder?: boolean;
  onPress?: () => void;
  showManualVerify?: boolean;
  onManualVerify?: () => void;
};

type TooltipState = {
  visible: boolean;
  top: number;
  left: number;
};

export default function ParcelBox({
  index,
  data,
  orderData,
  qty = 0,
  title = '',
  Icon = '',
  statusData = null,
  backOrder = false,
  onPress,
  showManualVerify = false,
  onManualVerify,
}: Props) {
  const { t } = useTranslation();
  const { UserData, isGpsTracking, GloblyTypeSlide, setToast } = useContext(GlobalContextData);
  const manualVerifyRef = useRef<View>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    top: 0,
    left: 0,
  });
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedTmsProduct, setSelectedTmsProduct] = useState<any>(null);
  const [savedTmsProduct, setSavedTmsProduct] = useState<any>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const tmsProductList = useMemo(
    () =>
      Array.isArray(orderData?.tms_product_list)
        ? orderData.tms_product_list.filter((product: any) => product?.id != null)
        : [],
    [orderData?.tms_product_list],
  );

const customerCountryId = useMemo(
  () =>
    Number(
      orderData?.customer?.country?? orderData?.deliver_country ??
      orderData?.customer?.country?.id 
    ),
  [orderData])
const isCustomerCountryPrice = useCallback(
  (price: any) =>
    Number.isFinite(customerCountryId) &&
    Number(price?.country) === customerCountryId,
  [customerCountryId]
);
  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return '';

    let url = sharedLink
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com');

    url = url.replace(/[?&](dl|raw)=\d/g, '');
    url += (url.includes('?') ? '&' : '?') + 'raw=1';

    return encodeURI(url);
  };

  const isAddon = Number(data?.is_addon) === 1;
  const visibleTitle = savedTmsProduct?.product_name || title;
  const titleWithAddon = isAddon
    ? `${visibleTitle}${visibleTitle.toLowerCase().includes('(addon)') ? '' : ` (${t('addon')})`}`
    : visibleTitle;
  const displayTitle =
    titleWithAddon.length > 70
      ? titleWithAddon.slice(0, 67).trim() + '...'
      : titleWithAddon;

  const isShiftBlocked =
    UserData?.user?.role === 'chauffeur' &&
    GloblyTypeSlide === 'pickup_dropoff' &&
    !isGpsTracking;

  const closeTooltip = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleManualVerifyPress = useCallback(() => {
    if (isShiftBlocked) {
      manualVerifyRef.current?.measureInWindow((x, y, width) => {
        const screenWidth = Dimensions.get('window').width;
        const tooltipWidth = 260;
        let left = x + width / 2 - tooltipWidth / 2;
        left = Math.max(12, Math.min(left, screenWidth - tooltipWidth - 12));
        setTooltip({
          visible: true,
          top: Math.max(12, y - 78),
          left,
        });
      });
      return;
    }

    onManualVerify?.();
  }, [isShiftBlocked, onManualVerify]);

  const openProductModal = useCallback(() => {
    // Prefer the product that was actually saved last (savedTmsProduct) so the
    // dropdown re-opens showing the current selection instead of resetting to
    // tmsProductList[0]. Only fall back to matching against the original
    // data?.tms_product_id / data?.tms_product_name when nothing has been
    // saved yet in this session.
    const matchBySavedId =
      savedTmsProduct &&
      tmsProductList.find(
        (product: any) => Number(product?.id) === Number(savedTmsProduct?.id),
      );

    const matchByDataProps = tmsProductList.find(
      (product: any) =>
        Number(product?.id) === Number(data?.tms_product_id) ||
        product?.product_name === data?.tms_product_name,
    );

    const currentProduct =
      matchBySavedId || savedTmsProduct || matchByDataProps || tmsProductList[0] || null;

    setSelectedTmsProduct(currentProduct);
    setIsProductModalOpen(true);
  }, [data?.tms_product_id, data?.tms_product_name, savedTmsProduct, tmsProductList]);

  const closeProductModal = useCallback(() => {
    setIsProductModalOpen(false);
  }, []);

  const saveProductChange = useCallback(async () => {
    const itemId = data?.id ?? data?.item_id;
    const orderId = data?.tms_order_id ?? data?.order_id ?? orderData?.id ?? orderData?.order_data?.id;
    const productId = selectedTmsProduct?.id;

    if (!itemId || !orderId || !productId || isSavingProduct) {
      setToast({ top: 45, text: t('Unable to save product change'), type: 'error', visible: true });
      return;
    }

    setIsSavingProduct(true);
    try {
      const requestPayload = {
        token: UserData?.user?.verify_token,
        relaties_id: UserData?.relaties?.id,
        role: UserData?.user?.role,
        user_id: UserData?.user?.id,
        item_id: itemId,
        order_id: orderId,
        product_id: productId,
      };

      console.log('[ParcelBox] update_order_item_product request payload:', requestPayload);

      const res = await ApiService(apiConstants.update_order_item_product, {
        customData: requestPayload,
      });


      if (res?.status || res?.status_code == 200) {
        setSavedTmsProduct(selectedTmsProduct);
        setToast({
          top: 45,
          text: t(res?.message || 'Product updated successfully'),
          type: 'success',
          visible: true,
        });
        closeProductModal();
        return;
      }

      setToast({
        top: 45,
        text: t(res?.message || 'Unable to save product change'),
        type: 'error',
        visible: true,
      });
    } catch (error) {
      console.log('[ParcelBox] update_order_item_product error:', error);
      setToast({ top: 45, text: t('Unable to save product change'), type: 'error', visible: true });
    } finally {
      setIsSavingProduct(false);
    }
  }, [UserData, closeProductModal, data, isSavingProduct, orderData, selectedTmsProduct, setToast, t]);

  return (
    <>
      <Pressable style={[styles.container, isAddon && styles.addonContainer]}>
        <View style={[styles.LeftSection, isAddon && styles.addonLeftSection]}>
          <View style={styles.NumberBox}>
            <Text style={styles.Text}>{index + 1}</Text>
          </View>

          <Text
            numberOfLines={3}
            style={[
              styles.Text,
              styles.TitleText,
              isAddon && styles.addonTitleText,
              { fontSize: titleWithAddon.length > 40 ? 12 : 13 },
            ]}
          >
            {displayTitle}
          </Text>
        </View>

        <View style={styles.RightSection}>
          {
            data?.can_update_tms_product == 1 &&
            <Pressable
              style={[styles.itemLable,{backgroundColor:Colors.primary}]}
              onPress={openProductModal}
              accessibilityRole="button"
              accessibilityLabel={t('Update Product')}
            >
              <Image
                source={Images.ExchangeIcon}
                style={{ width: 18, height: 18 }}
                tintColor={Colors.white}
              />
            </Pressable>
          }
          {data?.tmslabel && (
            <View
              style={[
                styles.itemLable,
                { backgroundColor: data?.tmslabel?.color },
              ]}
            >
              <Image
                source={{ uri: getDirectDropboxLink(data?.tmslabel?.shared_link) }}
                style={{ width: 20, height: 20 }}
              />
            </View>
          )}
          <View
            style={[
              styles.Status,
              { backgroundColor: data?.tmsstatus?.color || Colors.background },
            ]}
          >
            <Image
              source={{
                uri: Icon || getDirectDropboxLink(data?.tmsstatus?.shared_link),
              }}
              style={styles.Icon}
              contentFit="contain"
              tintColor={Colors.black}
              cachePolicy="memory-disk"
              transition={200}
            />
          </View>
          {showManualVerify && (
            <View ref={manualVerifyRef} collapsable={false}>
              <Pressable
                style={styles.ManualVerifyBtn}
                onPress={handleManualVerifyPress}
              >
                <RNImage
                  source={Images.CheckSlotIcon}
                  style={styles.ManualVerifyIcon}
                />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>

      <Modal transparent visible={tooltip.visible} animationType="fade" onRequestClose={closeTooltip}>
        <Pressable style={styles.tooltipOverlay} onPress={closeTooltip}>
          <View
            style={[
              styles.tooltipContainer,
              { top: tooltip.top, left: tooltip.left },
            ]}
          >
            <View style={styles.tooltipBox}>
              <Text style={styles.tooltipText}>
                {t(
                  'Please start your shift to verify parcels. This feature will be available once GPS tracking is enabled.',
                )}
              </Text>
            </View>
            <View style={styles.tooltipArrow} />
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        visible={isProductModalOpen}
        animationType="fade"
        onRequestClose={closeProductModal}
      >
        <View style={styles.productOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeProductModal} />
          <View
            style={[
              styles.productModal,
              { width: screenWidth * 0.9, height: screenHeight * 0.85 },
            ]}
          >
            <View style={styles.productModalHeader}>
              <View style={styles.productHeaderContent}>
                <Text style={styles.productModalTitle}>{t('Update Product')}</Text>
                <Text style={styles.productModalSubTitle}>{t('Choose a TMS product and review its prices')}</Text>
              </View>
              <Pressable
                style={styles.productCloseButton}
                onPress={closeProductModal}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Text style={styles.productCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.productScrollView} showsVerticalScrollIndicator={false}>
              <Text style={styles.productFieldLabel}>{t('External Product')}</Text>
              <View style={styles.externalProductField}>
                <Text style={styles.externalProductText} numberOfLines={1}>
                  {data?.external_product_name || '-'}
                </Text>
              </View>

              <Text style={styles.productFieldLabel}>{t('Select Product')}</Text>
              <Dropdown
                style={styles.productDropdown}
                data={tmsProductList}
                labelField="product_name"
                valueField="id"
                value={selectedTmsProduct?.id ?? null}
                placeholder={t('Select Product')}
                search
                searchPlaceholder={t('Search product')}
                maxHeight={270}
                autoScroll={false}
                onChange={(product) => setSelectedTmsProduct(product)}
                placeholderStyle={styles.dropdownPlaceholder}
                selectedTextStyle={styles.dropdownSelectedText}
                itemTextStyle={styles.dropdownItemText}
              />

              <View style={styles.priceCard}>
                <Text style={styles.priceCardTitle}>{t('Selected product prices')}</Text>
                <View style={styles.priceTableHeader}>
                  <Text style={[styles.priceHeaderText, styles.countryCell]}>{t('Country')}</Text>
                  <Text style={[styles.priceHeaderText, styles.priceCell]}>{t('Price')}</Text>
                </View>
                {Array.isArray(selectedTmsProduct?.company_tms_prices) && selectedTmsProduct.company_tms_prices.length > 0 ? (
                  selectedTmsProduct.company_tms_prices.map((price: any, priceIndex: number) => {
                    const isDeliveryCountry = isCustomerCountryPrice(price);

                    return (
                    <View
                      key={String(price?.id ?? priceIndex)}
                      style={[styles.priceRow, isDeliveryCountry && styles.deliveryPriceRow]}
                    >
                      <Text style={[styles.priceValueText, styles.countryCell]} numberOfLines={1}>
                        {price?.country_name?.name || '-'}
                      </Text>
                      <Text style={[styles.priceValueText, styles.priceCell]}>
                        {price?.currency_symbols?.symbol || ''}{price?.price_per_unit ?? '-'}
                      </Text>
                    </View>
                    );
                  })
                ) : (
                  <Text style={styles.noPricesText}>{t('No prices available for this product')}</Text>
                )}
              </View>
            </ScrollView>

            <View style={styles.productActions}>
              <Pressable style={[styles.productActionButton, styles.cancelAction]} onPress={closeProductModal}>
                <Text style={styles.cancelActionText}>{t('Cancel')}</Text>
              </Pressable>
              <Pressable
                disabled={!selectedTmsProduct || isSavingProduct}
                style={[
                  styles.productActionButton,
                  styles.saveAction,
                  (!selectedTmsProduct || isSavingProduct) && styles.disabledAction,
                ]}
                onPress={saveProductChange}
              >
                <Text style={styles.saveActionText}>
                  {isSavingProduct ? t('Saving...') : t('Save Changes')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    elevation: 2,
    shadowColor: Colors.gray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  LeftSection: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addonContainer: {
    backgroundColor: Colors.litegray1,
    borderColor: Colors.litegray,
  },
  addonLeftSection: {
    paddingLeft: 4,
  },
  RightSection: {
    flex: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
  },
  NumberBox: {
    width: 36,
    height: 36,
    backgroundColor: Colors.BtnBg,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  Text: {
    fontSize: 14,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  TitleText: {
    marginLeft: 10,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  addonTitleText: {
    color: Colors.darkText,
  },
  LabelText: {
    fontSize: 10,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
    textAlign: 'right',
    marginRight: 8,
  },
  Status: {
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  Icon: {
    width: 18,
    height: 18,
  },
  itemLable: {
    width: 25,
    height: 25,
    backgroundColor: Colors.gray,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ManualVerifyBtn: {
    width: 30,
    height: 30,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primaryopacity,
    marginLeft: 6,
  },
  ManualVerifyIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  tooltipOverlay: {
    flex: 1,
  },
  tooltipContainer: {
    position: 'absolute',
    width: 260,
  },
  tooltipBox: {
    backgroundColor: '#5B7FFF',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: FONTS.Medium,
    textAlign: 'center',
    lineHeight: 18,
  },
  tooltipArrow: {
    alignSelf: 'flex-end',
    marginRight: 10,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#5B7FFF',
  },
  productOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 35, 57, 0.58)',
  },
  productModal: {
    alignSelf: 'center',
    padding: 22,
    borderRadius: 16,
    backgroundColor: Colors.white,
    shadowColor: '#10233B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
    elevation: 12,
  },
  productModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  productHeaderContent: {
    flex: 1,
    paddingRight: 12,
  },
  productScrollView: {
    flex: 1,
  },
  productModalTitle: {
    fontSize: 21,
    color: '#243B53',
    fontFamily: FONTS.SemiBold,
  },
  productModalSubTitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.darkText,
    fontFamily: FONTS.Regular,
  },
  productCloseButton: {
    width: 34,
    height: 34,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#EEF2F6',
  },
  productCloseText: {
    marginTop: -3,
    fontSize: 27,
    lineHeight: 30,
    color: '#60758A',
    fontFamily: FONTS.Regular,
  },
  productFieldLabel: {
    marginBottom: 7,
    fontSize: 13,
    color: '#52667B',
    fontFamily: FONTS.Medium,
  },
  externalProductField: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5D9AA',
    borderRadius: 8,
    backgroundColor: '#FFFDF1',
  },
  externalProductText: {
    fontSize: 15,
    color: Colors.primary,
    fontFamily: FONTS.SemiBold,
  },
  productDropdown: {
    height: 50,
    paddingHorizontal: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    backgroundColor: '#FAFCFF',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: Colors.darkText,
    fontFamily: FONTS.Regular,
  },
  dropdownSelectedText: {
    fontSize: 15,
    color: '#243B53',
    fontFamily: FONTS.SemiBold,
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#243B53',
    fontFamily: FONTS.Regular,
  },
  priceCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DCE5EE',
    borderRadius: 10,
  },
  priceCardTitle: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    fontSize: 14,
    color: '#52667B',
    fontFamily: FONTS.SemiBold,
  },
  priceTableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#DCE5EE',
    backgroundColor: '#F5F8FB',
  },
  priceRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  deliveryPriceRow: {
    backgroundColor: '#d1e7dd',
  },
  countryCell: {
    flex: 1,
  },
  priceCell: {
    width: 110,
    textAlign: 'right',
  },
  priceHeaderText: {
    fontSize: 12,
    color: '#52667B',
    textTransform: 'uppercase',
    fontFamily: FONTS.SemiBold,
  },
  priceValueText: {
    fontSize: 15,
    color: '#243B53',
    fontFamily: FONTS.Regular,
  },
  noPricesText: {
    padding: 18,
    fontSize: 14,
    color: Colors.darkText,
    textAlign: 'center',
    fontFamily: FONTS.Regular,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  productActionButton: {
    minWidth: 120,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  cancelAction: {
    backgroundColor: '#6F8499',
  },
  saveAction: {
    backgroundColor: '#32CE7A',
  },
  disabledAction: {
    opacity: 0.48,
  },
  cancelActionText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
  },
  saveActionText: {
    fontSize: 14,
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
  },
});