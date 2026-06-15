import { Colors } from '@/src/utils/colors';
import { getCurrentTimeString } from '@/src/utils/regionTripApi';
import { FONTS } from '@/src/utils/storeData';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Images } from '../assets/images';

type Props = {
  time?: string;
  setTime?: (value: string) => void;
};

const parseTimeToDate = (time?: string) => {
  const date = new Date();
  if (!time) return date;

  const [hours = '0', minutes = '0', seconds = '0'] = time.split(':');
  date.setHours(Number(hours), Number(minutes), Number(seconds), 0);
  return date;
};

const formatTime = (date: Date) => {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

export default function TimePickerField({ time = '', setTime }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [iosDraft, setIosDraft] = useState(parseTimeToDate(time));

  const displayTime = useMemo(() => {
    if (!time) return '';
    const [hh, mm] = time.split(':');
    return `${hh}:${mm}`;
  }, [time]);

  useEffect(() => {
    if (!time && setTime) {
      setTime(getCurrentTimeString());
    }
  }, [time, setTime]);

  useEffect(() => {
    setIosDraft(parseTimeToDate(time));
  }, [time]);

  const applyTime = (selectedDate: Date) => {
    setTime?.(formatTime(selectedDate));
  };

  const handleAndroidChange = (_event: any, selectedDate?: Date) => {
    setOpen(false);
    if (selectedDate) {
      applyTime(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.field,
          { borderColor: time ? Colors.primary : Colors.Boxgray },
        ]}
        onPress={() => setOpen(true)}
      >
        <Image
          source={Images.date}
          style={styles.icon}
          tintColor={time ? Colors.primary : Colors.darkText}
        />
        {displayTime ? (
          <Text style={styles.valueText}>{displayTime}</Text>
        ) : (
          <Text style={styles.placeholderText}>{t('Select Time')}</Text>
        )}
      </Pressable>

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={parseTimeToDate(time)}
          mode="time"
          is24Hour
          display="default"
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={open}
          transparent
          animationType="fade"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
            <Pressable style={styles.iosSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.iosHeader}>
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.iosAction}>{t('Cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    applyTime(iosDraft);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.iosAction, styles.iosDone]}>
                    {t('Done')}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={iosDraft}
                mode="time"
                is24Hour
                display="spinner"
                onChange={(_event, selectedDate) => {
                  if (selectedDate) setIosDraft(selectedDate);
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  field: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1.2,
    paddingHorizontal: 15,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    backgroundColor: Colors.white,
  },
  icon: {
    width: 22,
    height: 22,
  },
  valueText: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: FONTS.Regular,
  },
  placeholderText: {
    fontSize: 14,
    color: Colors.darkText,
    fontFamily: FONTS.Regular,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  iosSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.litegray,
  },
  iosAction: {
    fontSize: 15,
    fontFamily: FONTS.Medium,
    color: Colors.darkText,
  },
  iosDone: {
    color: Colors.primary,
  },
});
