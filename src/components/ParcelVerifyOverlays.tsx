import AnimatedModal from '@/src/components/AnimatedModal';
import ConformationModal from '@/src/components/ConformationModal';
import LoadingModal from '@/src/components/LoadingModal';
import ParcelVerifyCommentModal from '@/src/components/ParcelVerifyCommentModal';
import PickupPlannedSheet from '@/src/components/PickupPlannedSheet';
import ScannerInfoModal from '@/src/components/ScannerInfoModal';
import SecondCustomModal from '@/src/components/SecondCustomModal';
import SignatureModal from '@/src/components/SignatureModal';
import { Colors } from '@/src/utils/colors';
import { GlobalContextData } from '@/src/context/GlobalContext';
import React, { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsFocused } from '@react-navigation/native';
import type { useParcelVerifyFlow } from '@/src/hooks/useParcelVerifyFlow';

type VerifyFlow = ReturnType<typeof useParcelVerifyFlow>;

type Props = {
  flow: VerifyFlow;
  navigation: any;
};

export default function ParcelVerifyOverlays({ flow, navigation }: Props) {
  const { t } = useTranslation();
  const isFocused = useIsFocused();
  const {
    GloblyTypeSlide,
    AllDeliveyLabel,
    AllDamageListReason,
    selectDamageData,
  } = useContext(GlobalContextData);

  // Shared commentVisible — only the focused screen mounts the modal UI.
  const commentVisible = Boolean(flow.comment && isFocused);
  const signatureVisible = Boolean(flow.showSig && isFocused);
  const secondModalVisible = flow.secondModal?.visible && isFocused
    ? flow.secondModal
    : { ...flow.secondModal, visible: false };

  return (
    <>
      <PickupPlannedSheet
        visible={flow.pickupPlannedSheetOpen.visible}
        orderData={flow.pickupPlannedSheetOpen.orderData}
        scanItemId={flow.pickupPlannedSheetOpen.scanPayload?.item_id}
        loading={flow.isLoading}
        onPickupWithPhoto={flow.handlePickupWithPhoto}
        onCancelAndNewScan={flow.closePickupPlannedSheet}
        onCancelPickup={flow.closePickupPlannedSheet}
        onPickupNextScan={flow.handlePickupNextScan}
      />

      <ScannerInfoModal
        InfoTitle={flow.conformationModal.title}
        type={flow.conformationModal?.type || 0}
        visible={flow.conformationModal?.visible}
        personData={flow.conformationModal?.personData}
        RText={flow.conformationModal.RButtonText}
        LText={flow.conformationModal.LButtonText}
        onPress={() => {
          if (flow.conformationModal.RButtonText === t('Take Photo')) {
            flow.closeConformationModal();
            navigation.navigate('Camera', { from: 'Pickup' });
          } else {
            flow.conformationModal.onPress?.();
          }
        }}
        ProductItem={flow.conformationModal?.ProductItem}
        OrderId={flow.conformationModal.order_id}
        bgColor={flow.conformationModal?.bgColor || ''}
        onClose={flow.closeConformationModal}
        OrderData={flow.conformationModal?.OrderData}
        delivery_btn={flow.conformationModal?.delivery_btn}
        stopData={flow.conformationModal?.stopData}
        NewScanText={flow.conformationModal?.NewScanText}
        onNewScanPress={
          flow.conformationModal?.NewScanText
            ? flow.closeConformationModal
            : undefined
        }
        UnloadingText={flow.conformationModal?.UnloadingText}
        onUnloadingPress={flow.conformationModal?.onUnloadingPress}
      />

      <ConformationModal
        IsVisible={flow.alertModalOpen.visible}
        onClose={() => flow.setAlerModalOpen((prev: any) => ({ ...prev, visible: false }))}
        Title={flow.alertModalOpen.title}
        Icon={flow.alertModalOpen.Icon}
        LeftButtonText={flow.alertModalOpen.LButtonText}
        RightButtonText={flow.alertModalOpen.RButtonText}
        RightBgColor={flow.alertModalOpen.RButtonStyle}
        LeftBGColor={flow.alertModalOpen.LButtonStyle}
        RTextColor={flow.alertModalOpen.RColor}
        LTextColor={flow.alertModalOpen.LColor}
        onPress={flow.alertModalOpen.onPress}
        Description={flow.alertModalOpen.Description}
      />

      <AnimatedModal
        visible={Boolean(flow.evetyTimeShowDeliveryLabelList)}
        setVisible={flow.setEvetyTimeShowDeliveryLabelList}
        onCancel={flow.closeDeliveryLabelModal}
        AllDeliveyLabel={AllDeliveyLabel}
        fun={flow.openCameraProofAfterLabelSelect}
        setSelectCurrentDeliveryLabel={flow.handleSelectDeliveryLabel}
        AllDamageListReason={AllDamageListReason}
        setselectDamageData={flow.handleSelectDamage}
        selectDamageData={selectDamageData}
        GloblyTypeSlide={GloblyTypeSlide}
        ItemsData={flow.itemsData}
      />

      <ParcelVerifyCommentModal
        visible={commentVisible}
        userData={flow.userData}
        itemsData={flow.itemsData}
        selectCurrentDeliveryLabel={flow.effectiveDeliveryLabel}
        allDamageListReason={flow.allDamageListReason}
        selectDamageData={selectDamageData}
        setselectDamageData={flow.handleSelectDamage}
        description={flow.description}
        setDescription={flow.setDescription}
        commentError={flow.commentError}
        commentLoader={flow.commentLoader}
        isCommentOptional={flow.isCommentOptional}
        onSubmit={flow.commentFun}
        onClose={() => flow.setComment(false)}
      />

      <SignatureModal
        IsLoading={flow.signatureLoader}
        visible={signatureVisible}
        defaultName={flow.itemsData?.display_name}
        ProductDamageList={flow.productDamageList}
        onClose={() => flow.setShowSig(false)}
        onPress={flow.handleSignatureCameraPress}
        onSave={flow.customerSignatureFun}
        onClear={() => {}}
      />

      <SecondCustomModal SecondModal={secondModalVisible} />

      <LoadingModal visible={flow.isLoading} message={t('Please wait…')} />
    </>
  );
}
