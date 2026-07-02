import { Image } from 'expo-image';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dimensions,
  Image as RNImage,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Images } from '../assets/images';
import { GlobalContextData } from '../context/GlobalContext';
import { Colors } from '../utils/colors';
import { FONTS } from '../utils/storeData';

type Props = {
  index: number;
  data: any;
  qty?: number;
  title?: string;
  Icon?: string | null;
  statusData?: any;
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
  const { UserData, isGpsTracking, GloblyTypeSlide } = useContext(GlobalContextData);
  const manualVerifyRef = useRef<View>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    top: 0,
    left: 0,
  });

  const getDirectDropboxLink = (sharedLink: string) => {
    if (!sharedLink) return '';

    let url = sharedLink
      .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
      .replace('dropbox.com', 'dl.dropboxusercontent.com');

    url = url.replace(/[?&](dl|raw)=\d/g, '');
    url += (url.includes('?') ? '&' : '?') + 'raw=1';

    return encodeURI(url);
  };

  const displayTitle =
    title.length > 70 ? title.slice(0, 67).trim() + '...' : title;

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

    if (UserData?.user?.role === 'chauffeur' && !isGpsTracking) {
      return;
    }

    onManualVerify?.();
  }, [isShiftBlocked, UserData?.user?.role, isGpsTracking, onManualVerify]);

  return (
    <>
      <Pressable style={styles.container}>
        <View style={styles.LeftSection}>
          <View style={styles.NumberBox}>
            <Text style={styles.Text}>{index + 1}</Text>
          </View>

          <Text
            numberOfLines={3}
            style={[
              styles.Text,
              styles.TitleText,
              { fontSize: title.length > 40 ? 12 : 13 },
            ]}
          >
            {displayTitle}
          </Text>
        </View>

        <View style={styles.RightSection}>
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
});
