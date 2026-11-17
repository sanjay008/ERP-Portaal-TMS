import { Images } from "@/src/assets/images";
import CustomCollapsible from "@/src/components/CustomCollapsible";
import { Colors } from "@/src/utils/colors";
import { FONTS } from "@/src/utils/storeData";
import React, { ReactNode, useState } from "react";
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  title: string;
  icon: ImageSourcePropType;
  iconBg: string;
  children?: ReactNode;
  defaultOpen?: boolean;
};

export default function OrderSectionAccordion({
  title,
  icon,
  iconBg,
  children,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.85}
        onPress={() => setOpen((prev) => !prev)}
      >
        <View style={styles.left}>
          <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
            <Image source={icon} style={styles.icon} tintColor={Colors.white} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.chevronBox}>
          <Image
            source={Images.down}
            style={[
              styles.chevron,
              { transform: [{ rotate: open ? "180deg" : "0deg" }] },
            ]}
          />
        </View>
      </TouchableOpacity>

      <CustomCollapsible visible={open} padding={0}>
        <View style={styles.body}>{children}</View>
      </CustomCollapsible>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    overflow: "hidden",
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 18,
    height: 18,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.SemiBold,
    color: Colors.black,
  },
  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.Boxgray,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  chevron: {
    width: 14,
    height: 14,
    tintColor: Colors.darkText,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.Boxgray,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
