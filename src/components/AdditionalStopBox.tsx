import { Images } from '@/src/assets/images';
import { Colors } from '@/src/utils/colors';
import { FONTS } from '@/src/utils/storeData';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type AdditionalStopItem = {
  id?: string | number | null;
  name?: string | null;
  address?: string | null;
  pickup_location?: string | null;
  deliver_location?: string | null;
  driver_note?: string | null;
  time_start?: string | null;
  time_end?: string | null;
  route_name?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  assignment_id?: number | null;
  route_stop_id?: number | null;
  tmsstatus?: {
    status_name?: string | null;
    color?: string | null;
  } | null;
  route_stop?: {
    sort_order?: number | null;
    route_eta?: string | null;
    eta_time?: string | null;
    leg_distance_km?: number | string | null;
    is_visited?: number | null;
    is_completed?: number | null;
  } | null;
};

type Props = {
  item: AdditionalStopItem;
  index?: number;
  onPress?: () => void;
};

const DEFAULT_ACCENT = '#0dcaf0';

function parseCoordinate(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function formatDistance(km: unknown): string {
  const num = Number(km);
  if (!Number.isFinite(num)) return '0';
  if (Number.isInteger(num)) return String(num);
  return num.toFixed(1);
}

export default function AdditionalStopBox({ item, index = 0, onPress }: Props) {
  const { t } = useTranslation();

  const accent = item?.tmsstatus?.color || DEFAULT_ACCENT;
  const statusLabel = item?.tmsstatus?.status_name || t('Additional Stop');
  const stopNumber =
    item?.route_stop?.sort_order != null
      ? Number(item.route_stop.sort_order)
      : index + 1;

  const timeWindow = useMemo(() => {
    const note = item?.driver_note?.trim();
    if (note) return note;

    const start = item?.time_start?.trim();
    const end = item?.time_end?.trim();
    if (start && end) return `${start} - ${end}`;
    return start || end || null;
  }, [item]);

  const address =
    item?.address?.trim() ||
    item?.pickup_location?.trim() ||
    item?.deliver_location?.trim() ||
    '';

  const eta =
    item?.route_stop?.route_eta?.trim() ||
    item?.route_stop?.eta_time?.trim() ||
    null;

  const distanceKm = formatDistance(item?.route_stop?.leg_distance_km ?? 0);
  const routeName = item?.route_name?.trim() || null;
  const isVisited =
    Number(item?.route_stop?.is_visited) === 1 ||
    Number(item?.route_stop?.is_completed) === 1;

  const openInMaps = async () => {
    const lat = parseCoordinate(item?.lat);
    const lng = parseCoordinate(item?.lng);

    if (lat == null || lng == null) return;

    const label = encodeURIComponent(item?.name || address || t('Additional Stop'));
    const coords = `${lat},${lng}`;
    const url =
      Platform.OS === 'ios'
        ? `maps:0,0?q=${label}@${coords}`
        : `geo:${coords}?q=${coords}(${label})`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to web maps
    }

    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${coords}`,
    );
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    openInMaps();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={handlePress}
    >
      <View style={[styles.header, { backgroundColor: accent }]}>
        <View style={styles.headerLeft}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{stopNumber}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {item?.name?.trim() || t('Additional Stop')}
          </Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText} numberOfLines={2}>
            {t(statusLabel).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.mainRow}>
          <View style={styles.infoCol}>
            {!!address && (
              <View style={styles.addressRow}>
                <Image
                  source={Images.LocationIcon}
                  style={styles.locationIcon}
                  tintColor={Colors.red}
                />
                <Text style={styles.addressText}>{address}</Text>
              </View>
            )}

            {!!timeWindow && (
              <View style={styles.scheduleRow}>
                <View style={styles.scheduleBadge}>
                  <Text style={styles.scheduleBadgeText}>{t('Scheduled')}</Text>
                </View>
                <Text style={styles.timeText}>{timeWindow}</Text>
              </View>
            )}
          </View>

          <View style={styles.metricsCol}>
            {!!eta && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>{t('ETA')}</Text>
                <Text style={styles.metricValueEta}>{eta}</Text>
              </View>
            )}
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('Distance')}</Text>
              <Text style={styles.metricValueDist}>
                {distanceKm} {t('KM')}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          {!!routeName && (
            <View style={styles.routePill}>
              <Text style={styles.routeText} numberOfLines={1}>
                {routeName.toUpperCase()}
              </Text>
            </View>
          )}

          {isVisited ? (
            <View style={styles.visitedPill}>
              <Text style={styles.visitedText}>{t('Visited')}</Text>
            </View>
          ) : (
            <Text style={styles.readOnlyHint}>{t('Tap to open in maps')}</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardPressed: {
    opacity: 0.94,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indexBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  indexText: {
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    lineHeight: 20,
  },
  statusPill: {
    maxWidth: '36%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  infoCol: {
    flex: 1,
    gap: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  locationIcon: {
    width: 16,
    height: 16,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.red,
    lineHeight: 19,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleBadge: {
    backgroundColor: Colors.primaryopacity,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scheduleBadgeText: {
    fontSize: 11,
    fontFamily: FONTS.SemiBold,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 13,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
  metricsCol: {
    gap: 8,
    minWidth: 72,
  },
  metricBox: {
    backgroundColor: Colors.litegray1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 72,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValueEta: {
    fontSize: 13,
    fontFamily: FONTS.SemiBold,
    color: Colors.red,
  },
  metricValueDist: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.litegray,
    paddingTop: 10,
  },
  routePill: {
    backgroundColor: Colors.Boxgray,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: '55%',
  },
  routeText: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.darkText,
  },
  visitedPill: {
    backgroundColor: Colors.litegreen,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  visitedText: {
    fontSize: 12,
    fontFamily: FONTS.SemiBold,
    color: Colors.green,
  },
  readOnlyHint: {
    flex: 1,
    textAlign: 'right',
    fontSize: 11,
    fontFamily: FONTS.Regular,
    color: Colors.textgray,
  },
});
