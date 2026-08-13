import apiConstants from '@/src/api/apiConstants';
import { useErrorHandle } from '@/src/components/ErrorHandle';
import { GlobalContextData } from '@/src/context/GlobalContext';
import ApiService from '@/src/utils/Apiservice';
import { Colors } from '@/src/utils/colors';
import { FONTS, height, width } from '@/src/utils/storeData';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

type CategoryRow = {
  id: number | string;
  category_name: string;
  products?: ProductRow[];
};

type ProductRow = {
  id: number | string;
  product_name: string;
};

type PriceRow = {
  id?: number | string;
  country?: number | string;
  minimum_quantity?: number | string;
  maximum_quantity?: number | string;
  price_per_unit?: number | string;
  currency_symbols?: { symbol?: string };
  country_name?: { id?: number | string; name?: string };
};

type AddProductPayload = {
  product_id: string | number;
  quantity: number;
  product_name?: string;
  is_set_product_price?: boolean;
  country_id?: string | number;
  price?: string | number;
};

type Props = {
  visible: boolean;
  orderId: string | number | null;
  itemId?: string | number | null;
  type?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onRequestAddProduct?: (payload: AddProductPayload) => void;
};

export default function AddWarehouseProductModal({
  visible,
  orderId,
  itemId = null,
  type = 'warehouse_change',
  onClose,
  onSuccess,
  onRequestAddProduct,
}: Props) {
  const { t } = useTranslation();
  const { ErrorHandle } = useErrorHandle();
  const { UserData, SelectCurrentDate, setToast } = useContext(GlobalContextData);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [deliveryCountryId, setDeliveryCountryId] = useState<number | string | null>(null);
  const [applicablePriceIds, setApplicablePriceIds] = useState<Set<string>>(new Set());
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [setPricesVisible, setSetPricesVisible] = useState(false);
  const [editablePrices, setEditablePrices] = useState<Record<string, string>>({});

  const resetForm = useCallback(() => {
    setSelectedCategoryId(null);
    setSelectedProductId(null);
    setQuantity('1');
    setPrices([]);
    setDeliveryCountryId(null);
    setApplicablePriceIds(new Set());
  }, []);

  useEffect(() => {
    if (!visible) {
      resetForm();
      setCategories([]);
      setLoadingCategories(false);
      setLoadingPrices(false);
      setSubmitting(false);
      setSetPricesVisible(false);
      setEditablePrices({});
      return;
    }

    let cancelled = false;
    resetForm();

    const loadCategories = async () => {
      if (orderId == null) return;

      setLoadingCategories(true);
      try {
        const res = await ApiService(apiConstants.get_add_product_categories, {
          customData: {
            token: UserData?.user?.verify_token,
            role: UserData?.user?.role,
            relaties_id: UserData?.relaties?.id,
            user_id: UserData?.user?.id,
            item_id: itemId,
            order_id: orderId,
            date: SelectCurrentDate,
            type,
          },
        });

        if (cancelled) return;

        if (res?.status) {
          setCategories(Array.isArray(res?.data?.categories) ? res.data.categories : []);
          return;
        }

        setCategories([]);
        setToast({
          top: 45,
          text: t(res?.message) || t('something_went_wrong'),
          type: 'error',
          visible: true,
        });
      } catch (error) {
        if (cancelled) return;
        setCategories([]);
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const productOptions = useMemo(() => {
    const category = categories.find((c) => String(c.id) === String(selectedCategoryId));
    return Array.isArray(category?.products) ? category.products : [];
  }, [categories, selectedCategoryId]);

  const fetchPrices = useCallback(
    async (productId: string | number) => {
      if (orderId == null) return;

      setLoadingPrices(true);
      setPrices([]);
      setDeliveryCountryId(null);
      setApplicablePriceIds(new Set());

      try {
        const res = await ApiService(apiConstants.get_add_product_prices, {
          customData: {
            token: UserData?.user?.verify_token,
            role: UserData?.user?.role,
            relaties_id: UserData?.relaties?.id,
            user_id: UserData?.user?.id,
            order_id: orderId,
            date: SelectCurrentDate,
            type,
            product_id: productId,
          },
        });

        if (res?.status) {
          const allPrices = Array.isArray(res?.data?.all_prices) ? res.data.all_prices : [];
          const applicable = Array.isArray(res?.data?.applicable_prices)
            ? res.data.applicable_prices
            : [];
          setPrices(allPrices);
          setDeliveryCountryId(res?.data?.delivery_country_id ?? null);
          setApplicablePriceIds(
            new Set(applicable.map((row: PriceRow) => String(row?.id)).filter(Boolean)),
          );
          return;
        }

        setToast({
          top: 45,
          text: t(res?.message) || t('something_went_wrong'),
          type: 'error',
          visible: true,
        });
      } catch (error) {
        setToast({
          top: 45,
          text: ErrorHandle(error).message,
          type: 'error',
          visible: true,
        });
      } finally {
        setLoadingPrices(false);
      }
    },
    [UserData, SelectCurrentDate, ErrorHandle, orderId, setToast, t, type],
  );

  const onCategoryChange = (category: CategoryRow) => {
    setSelectedCategoryId(category.id);
    setSelectedProductId(null);
    setPrices([]);
    setDeliveryCountryId(null);
    setApplicablePriceIds(new Set());
    setSetPricesVisible(false);
    setEditablePrices({});
  };

  const onProductChange = (product: ProductRow) => {
    setSelectedProductId(product.id);
    setSetPricesVisible(false);
    setEditablePrices({});
    fetchPrices(product.id);
  };

  const isHighlightedPrice = (price: PriceRow) => {
    if (price?.id != null && applicablePriceIds.has(String(price.id))) {
      return true;
    }
    if (deliveryCountryId == null) return false;
    return (
      String(price?.country) === String(deliveryCountryId) ||
      String(price?.country_name?.id) === String(deliveryCountryId)
    );
  };

  const openSetPricesModal = () => {
    if (!selectedProductId) {
      setToast({
        top: 45,
        text: t('Please select product'),
        type: 'error',
        visible: true,
      });
      return;
    }
    if (loadingPrices) return;
    if (!prices.length) {
      setToast({
        top: 45,
        text: t('No prices available for this product'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const draft: Record<string, string> = {};
    prices.forEach((price, index) => {
      const key = String(price?.id ?? index);
      const raw = price?.price_per_unit;
      draft[key] = raw == null || raw === '' ? '' : String(raw).replace(/\.00$/, '');
    });
    setEditablePrices(draft);
    setSetPricesVisible(true);
  };

  const closeSetPricesModal = () => {
    setSetPricesVisible(false);
    setEditablePrices({});
  };

  const onEditablePriceChange = (key: string, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    const normalized =
      parts.length <= 1 ? cleaned : `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}`;
    setEditablePrices((prev) => ({ ...prev, [key]: normalized }));
  };

  const getPriceCountryId = (price: PriceRow) =>
    price?.country ?? price?.country_name?.id ?? null;

  const handleSavePrices = async () => {
    if (submitting) return;

    if (!selectedProductId) {
      setToast({
        top: 45,
        text: t('Please select product'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const qtyNum = Number(quantity);
    if (!quantity || Number.isNaN(qtyNum) || qtyNum <= 0) {
      setToast({
        top: 45,
        text: t('Please enter a valid quantity'),
        type: 'error',
        visible: true,
      });
      return;
    }

    if (orderId == null) {
      setToast({
        top: 45,
        text: t('Invalid or missing order details. Please rescan.'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const targetPrice =
      prices.find((price) => isHighlightedPrice(price)) ||
      prices.find((price) => String(getPriceCountryId(price)) === String(deliveryCountryId)) ||
      prices[0];

    if (!targetPrice) {
      setToast({
        top: 45,
        text: t('No prices available for this product'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const targetKey = String(targetPrice?.id ?? prices.indexOf(targetPrice));
    const countryId = getPriceCountryId(targetPrice);
    const editedPrice = editablePrices[targetKey];

    if (countryId == null) {
      setToast({
        top: 45,
        text: t('something_went_wrong'),
        type: 'error',
        visible: true,
      });
      return;
    }

    if (editedPrice == null || editedPrice === '' || Number.isNaN(Number(editedPrice))) {
      setToast({
        top: 45,
        text: t('Please enter a valid price'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const selectedProduct = productOptions.find(
      (p) => String(p.id) === String(selectedProductId),
    );

    const requestData: Record<string, any> = {
      token: UserData?.user?.verify_token,
      relaties_id: UserData?.relaties?.id,
      role: UserData?.user?.role,
      user_id: UserData?.user?.id,
      order_id: orderId,
      product_id: selectedProductId,
      quantity: qtyNum,
      is_set_product_price: true,
      country_id: countryId,
      price: editedPrice,
    };

    if (selectedProduct?.product_name) {
      requestData.product_name = selectedProduct.product_name;
    }

    console.log('[add-product-to-order] Set Product Prices request:', requestData);

    setSubmitting(true);
    try {
      const res = await ApiService(apiConstants.add_product_to_order, {
        customData: requestData,
      });

      if (res?.status) {
        setPrices((prev) =>
          prev.map((price, index) => {
            const key = String(price?.id ?? index);
            if (!(key in editablePrices)) return price;
            return {
              ...price,
              price_per_unit: editablePrices[key],
            };
          }),
        );
        setToast({
          top: 45,
          text: t(res?.message) || t('Product added successfully'),
          type: 'success',
          visible: true,
        });
        closeSetPricesModal();
        onSuccess?.();
        return;
      }

      setToast({
        top: 45,
        text: t(res?.message) || t('something_went_wrong'),
        type: 'error',
        visible: true,
      });
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: 'error',
        visible: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (submitting) return;

    if (!selectedCategoryId) {
      setToast({
        top: 45,
        text: t('Please select category'),
        type: 'error',
        visible: true,
      });
      return;
    }
    if (!selectedProductId) {
      setToast({
        top: 45,
        text: t('Please select product'),
        type: 'error',
        visible: true,
      });
      return;
    }
    const qtyNum = Number(quantity);
    if (!quantity || Number.isNaN(qtyNum) || qtyNum <= 0) {
      setToast({
        top: 45,
        text: t('Please enter a valid quantity'),
        type: 'error',
        visible: true,
      });
      return;
    }
    if (orderId == null) {
      setToast({
        top: 45,
        text: t('Invalid or missing order details. Please rescan.'),
        type: 'error',
        visible: true,
      });
      return;
    }

    const selectedProduct = productOptions.find(
      (p) => String(p.id) === String(selectedProductId),
    );

    const payload: AddProductPayload = {
      product_id: selectedProductId,
      quantity: qtyNum,
      is_set_product_price: false,
      ...(selectedProduct?.product_name
        ? { product_name: selectedProduct.product_name }
        : {}),
    };

    if (onRequestAddProduct) {
      onRequestAddProduct(payload);
      return;
    }

    setSubmitting(true);
    try {
      const res = await ApiService(apiConstants.add_product_to_order, {
        customData: {
          token: UserData?.user?.verify_token,
          relaties_id: UserData?.relaties?.id,
          role: UserData?.user?.role,
          user_id: UserData?.user?.id,
          order_id: orderId,
          ...payload,
        },
      });

      if (res?.status) {
        setToast({
          top: 45,
          text: t(res?.message) || t('Product added successfully'),
          type: 'success',
          visible: true,
        });
        onClose();
        onSuccess?.();
        return;
      }

      setToast({
        top: 45,
        text: t(res?.message) || t('something_went_wrong'),
        type: 'error',
        visible: true,
      });
    } catch (error) {
      setToast({
        top: 45,
        text: ErrorHandle(error).message,
        type: 'error',
        visible: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <KeyboardAwareScrollView
          style={styles.awareScroll}
          contentContainerStyle={styles.awareContent}
          enableOnAndroid
          enableAutomaticScroll
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          extraScrollHeight={Platform.OS === 'ios' ? 60 : 120}
          extraHeight={Platform.OS === 'ios' ? 80 : 140}
          keyboardOpeningTime={0}
        >
          <View style={[styles.modal, { width: width * 0.92 }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('Add Product')}</Text>
              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            {loadingCategories ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.scrollContent}>
                <Text style={styles.label}>{t('Product Category')}</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={categories}
                  labelField="category_name"
                  valueField="id"
                  value={selectedCategoryId}
                  placeholder={t('-- Select --')}
                  search
                  searchPlaceholder={t('Search category')}
                  maxHeight={Math.min(240, height * 0.28)}
                  autoScroll={false}
                  onChange={onCategoryChange}
                  placeholderStyle={styles.dropdownPlaceholder}
                  selectedTextStyle={styles.dropdownSelectedText}
                  itemTextStyle={styles.dropdownItemText}
                />

                <Text style={styles.label}>{t('Product')}</Text>
                <Dropdown
                  style={styles.dropdown}
                  data={productOptions}
                  labelField="product_name"
                  valueField="id"
                  value={selectedProductId}
                  placeholder={t('-- Select Product --')}
                  search
                  searchPlaceholder={t('Search product')}
                  maxHeight={Math.min(240, height * 0.28)}
                  autoScroll={false}
                  disable={!selectedCategoryId}
                  onChange={onProductChange}
                  placeholderStyle={styles.dropdownPlaceholder}
                  selectedTextStyle={styles.dropdownSelectedText}
                  itemTextStyle={styles.dropdownItemText}
                />

                <Text style={styles.label}>{t('Quantity')}</Text>
                <View style={styles.qtyRow}>
                  <TextInput
                    style={styles.qtyInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor={Colors.gray}
                  />
                  {/* <Pressable
                    style={({ pressed }) => [
                      styles.qtyAddBtn,
                      !selectedProductId && styles.qtyAddBtnDisabled,
                      pressed && !!selectedProductId && styles.pressed,
                    ]}
                    onPress={openSetPricesModal}
                    disabled={!selectedProductId}
                  >
                    <Text style={styles.qtyAddText}>+</Text>
                  </Pressable> */}
                </View>

                {selectedProductId ? (
                  <View style={styles.priceCard}>
                    <Text style={styles.priceCardTitle}>{t('Product Prices')}</Text>
                    <View style={styles.priceTableHeader}>
                      <Text style={[styles.priceHeaderText, styles.countryCell]}>
                        {t('Destination Country')}
                      </Text>
                      <Text style={[styles.priceHeaderText, styles.qtyCell]}>
                        {t('Min Qty')}
                      </Text>
                      <Text style={[styles.priceHeaderText, styles.qtyCell]}>
                        {t('Max Qty')}
                      </Text>
                      <Text style={[styles.priceHeaderText, styles.priceCell]}>
                        {t('Price')}
                      </Text>
                    </View>

                    {loadingPrices ? (
                      <View style={styles.priceLoader}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                      </View>
                    ) : prices.length > 0 ? (
                      prices.map((price, index) => {
                        const highlighted = isHighlightedPrice(price);
                        return (
                          <View
                            key={String(price?.id ?? index)}
                            style={[styles.priceRow, highlighted && styles.highlightedPriceRow]}
                          >
                            <Text
                              style={[styles.priceValueText, styles.countryCell]}
                              numberOfLines={1}
                            >
                              {price?.country_name?.name || '-'}
                            </Text>
                            <Text style={[styles.priceValueText, styles.qtyCell]}>
                              {price?.minimum_quantity ?? '-'}
                            </Text>
                            <Text style={[styles.priceValueText, styles.qtyCell]}>
                              {price?.maximum_quantity ?? '-'}
                            </Text>
                            <Text style={[styles.priceValueText, styles.priceCell]}>
                              {price?.currency_symbols?.symbol || ''}
                              {price?.price_per_unit ?? '-'}
                            </Text>
                          </View>
                        );
                      })
                    ) : (
                      <Text style={styles.noPricesText}>
                        {t('No prices available for this product')}
                      </Text>
                    )}
                  </View>
                ) : null}
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.addBtn,
                  (submitting || !selectedProductId) && styles.disabledBtn,
                  pressed && styles.pressed,
                ]}
                onPress={handleAddProduct}
                disabled={submitting}
              >
                <Text style={styles.addBtnText}>
                  {submitting ? t('Saving...') : t('Add Product')}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  styles.cancelBtn,
                  pressed && styles.pressed,
                ]}
                onPress={onClose}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>{t('Cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>

      {setPricesVisible ? (
        <View style={styles.setPricesOverlay}>
          <View style={styles.setPricesBackdrop} />
          <KeyboardAwareScrollView
            style={styles.setPricesAwareScroll}
            contentContainerStyle={styles.setPricesAwareContent}
            enableOnAndroid
            enableAutomaticScroll
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            extraScrollHeight={Platform.OS === 'ios' ? 80 : 140}
            extraHeight={Platform.OS === 'ios' ? 100 : 160}
            keyboardOpeningTime={0}
          >
            <View style={[styles.setPricesModal, { width: width * 0.9 }]}>
              <View style={styles.setPricesHeader}>
                <View style={styles.setPricesHeaderText}>
                  <Text style={styles.setPricesTitle}>{t('Set Product Prices')}</Text>
                  <Text style={styles.setPricesSubtitle}>
                    {t(
                      'Set prices for all country tiers. When adding to the order, only tiers matching the delivery country will be used.',
                    )}
                  </Text>
                </View>
                <Pressable
                  style={styles.closeButton}
                  onPress={closeSetPricesModal}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('Close')}
                >
                  <Text style={styles.closeText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.priceTableHeader}>
                <Text style={[styles.setPricesHeaderCol, styles.countryCell]}>
                  {t('DESTINATION COUNTRY')}
                </Text>
                <Text style={[styles.setPricesHeaderCol, styles.qtyCell]}>
                  {t('MIN QTY')}
                </Text>
                <Text style={[styles.setPricesHeaderCol, styles.qtyCell]}>
                  {t('MAX QTY')}
                </Text>
                <Text style={[styles.setPricesHeaderCol, styles.priceCell]}>
                  {t('PRICE')}
                </Text>
              </View>

              {prices.map((price, index) => {
                const key = String(price?.id ?? index);
                const symbol = price?.currency_symbols?.symbol || '€';
                return (
                  <View key={key} style={styles.setPricesRow}>
                    <Text
                      style={[styles.priceValueText, styles.countryCell]}
                      numberOfLines={1}
                    >
                      {price?.country_name?.name || '-'}
                    </Text>
                    <Text style={[styles.priceValueText, styles.qtyCell]}>
                      {price?.minimum_quantity ?? '-'}
                    </Text>
                    <Text style={[styles.priceValueText, styles.qtyCell]}>
                      {price?.maximum_quantity ?? '-'}
                    </Text>
                    <View style={[styles.priceInputWrap, styles.priceCell]}>
                      <Text style={styles.priceCurrency}>{symbol}</Text>
                      <TextInput
                        style={styles.priceInput}
                        value={editablePrices[key] ?? ''}
                        onChangeText={(value) => onEditablePriceChange(key, value)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.gray}
                      />
                    </View>
                  </View>
                );
              })}

              <View style={styles.setPricesActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.setPricesActionBtn,
                    styles.setPricesCancelBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={closeSetPricesModal}
                  disabled={submitting}
                >
                  <Text style={styles.setPricesCancelText}>{t('Cancel')}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.setPricesActionBtn,
                    styles.setPricesSaveBtn,
                    submitting && styles.disabledBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleSavePrices}
                  disabled={submitting}
                >
                  <Text style={styles.setPricesSaveText}>
                    {submitting ? t('Saving...') : t('Save')}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAwareScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18, 35, 57, 0.58)',
  },
  awareScroll: {
    flex: 1,
    width: '100%',
  },
  awareContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  modal: {
    maxHeight: height * 0.9,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    elevation: 12,
    shadowColor: '#10233B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF3',
  },
  title: {
    fontSize: 20,
    color: '#243B53',
    fontFamily: FONTS.SemiBold,
  },
  closeButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#EEF2F6',
  },
  closeText: {
    marginTop: -3,
    fontSize: 27,
    lineHeight: 30,
    color: '#60758A',
    fontFamily: FONTS.Regular,
  },
  loaderBox: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  label: {
    marginBottom: 7,
    fontSize: 13,
    color: '#52667B',
    fontFamily: FONTS.Medium,
  },
  dropdown: {
    minHeight: 48,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.white,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: Colors.gray,
    fontFamily: FONTS.Regular,
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  qtyInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.black,
    fontFamily: FONTS.Regular,
    backgroundColor: Colors.white,
  },
  qtyAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
  },
  qtyAddBtnDisabled: {
    backgroundColor: '#A8B5C4',
    opacity: 0.55,
  },
  qtyAddText: {
    fontSize: 28,
    lineHeight: 30,
    color: Colors.white,
    fontFamily: FONTS.SemiBold,
    marginTop: -2,
  },
  priceCard: {
    borderWidth: 1,
    borderColor: '#E8EDF3',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  priceCardTitle: {
    fontSize: 15,
    color: '#243B53',
    fontFamily: FONTS.SemiBold,
    marginBottom: 10,
  },
  priceTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#D9E2EC',
    marginBottom: 4,
  },
  priceHeaderText: {
    fontSize: 11,
    color: '#52667B',
    fontFamily: FONTS.SemiBold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  highlightedPriceRow: {
    backgroundColor: Colors.litegreen,
  },
  priceValueText: {
    fontSize: 12,
    color: '#243B53',
    fontFamily: FONTS.Regular,
  },
  countryCell: {
    flex: 1.4,
  },
  qtyCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  priceCell: {
    flex: 0.9,
    textAlign: 'right',
  },
  priceLoader: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  noPricesText: {
    paddingVertical: 14,
    fontSize: 13,
    color: Colors.gray,
    fontFamily: FONTS.Regular,
    textAlign: 'center',
  },
  actions: {
    gap: 10,
    paddingTop: 12,
  },
  actionBtn: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: Colors.green,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  cancelBtn: {
    backgroundColor: '#E8EDF3',
  },
  cancelBtnText: {
    color: '#52667B',
    fontSize: 16,
    fontFamily: FONTS.SemiBold,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.88,
  },
  setPricesOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  setPricesBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  setPricesAwareScroll: {
    flex: 1,
    width: '100%',
  },
  setPricesAwareContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: Math.max(24, height * 0.06),
    paddingBottom: 48,
  },
  setPricesModal: {
    maxHeight: height * 0.82,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    elevation: 16,
    shadowColor: '#10233B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  setPricesHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  setPricesHeaderText: {
    flex: 1,
    paddingRight: 8,
  },
  setPricesTitle: {
    fontSize: 18,
    color: '#243B53',
    fontFamily: FONTS.SemiBold,
  },
  setPricesSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#627D98',
    fontFamily: FONTS.Regular,
  },
  setPricesHeaderCol: {
    fontSize: 10,
    color: '#829AB1',
    fontFamily: FONTS.SemiBold,
  },
  setPricesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  priceInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
  },
  priceCurrency: {
    fontSize: 13,
    color: '#486581',
    fontFamily: FONTS.Medium,
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    fontSize: 13,
    color: '#243B53',
    fontFamily: FONTS.Regular,
    textAlign: 'right',
  },
  setPricesActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
  },
  setPricesActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setPricesCancelBtn: {
    backgroundColor: '#E8EDF3',
  },
  setPricesCancelText: {
    color: '#52667B',
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
  },
  setPricesSaveBtn: {
    backgroundColor: Colors.primary,
  },
  setPricesSaveText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
  },
});
