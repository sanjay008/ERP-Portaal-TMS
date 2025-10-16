// import React, { useContext, useEffect, useState } from "react";
// import { useTranslation } from "react-i18next";
// import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
// import { Calendar, LocaleConfig } from "react-native-calendars";
// import Modal from "react-native-modal";
// import { Images } from "../assets/images";
// import { GlobalContextData } from "../context/GlobalContext";
// import { Colors } from "../utils/colors";
// import { formatDate } from "./DateFormate";
// type Props = {
//   date: string;
//   setDate?: any;
// };
// LocaleConfig.locales['en'] = {
//   monthNames: [
//     'January',
//     'February',
//     'March',
//     'April',
//     'May',
//     'June',
//     'July',
//     'August',
//     'September',
//     'October',
//     'November',
//     'December',
//   ],
//   monthNamesShort: [
//     'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
//   ],
//   dayNames: [
//     'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
//   ],
//   dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
//   today: "Today"
// };

// LocaleConfig.locales['nl'] = {
//   monthNames: [
//     'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
//     'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
//   ],
//   monthNamesShort: [
//     'Jan', 'Feb', 'Maa', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'
//   ],
//   dayNames: ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'],
//   dayNamesShort: ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],
//   today: "Vandaag"
// };

// export default function CalenderDate({ date, setDate }: Props) {
//   const [IsVisible, setVisible] = useState<boolean>(false);
//   const { t } = useTranslation();
//   const {
//     GOOGLE_API_KEY,
//     setGOOGLE_API_KEY,
//     CompanyLogo,
//     setCompanyLogo,
//     Permission,
//     setPermission,
//     SelectLanguage,
//     setSelectLanguage,
//   } = useContext(GlobalContextData);

//   LocaleConfig.defaultLocale = SelectLanguage;

//   useEffect(() => {
//     if (!date && setDate) {
//       const today = new Date().toISOString().split("T")[0];
//       setDate(today);
//     }
//   }, [date, setDate]);

//   const today = new Date().toISOString().split("T")[0];
//   return (
//     <View style={styles.container}>
//       <View
//         style={[
//           styles.DateShowContainer,
//           { borderColor: date ? Colors.primary : Colors.Boxgray },
//         ]}
//       >
//         <Image
//           source={Images.date}
//           style={styles.Icon}
//           tintColor={date ? Colors.primary : Colors.darkText}
//         />
//         {date ? (
//           <Text style={styles.Text}>{formatDate(date, SelectLanguage)}</Text>
//         ) : (
//           <Text style={styles.DarkText}>{t("Select Date")}</Text>
//         )}
//       </View>

//       <TouchableOpacity
//         style={styles.Calender}
//         onPress={() => setVisible(true)}
//       >
//         <Image source={Images.calender} style={{ width: 22, height: 22 }} />
//       </TouchableOpacity>
//       <Modal
//         isVisible={IsVisible}
//         animationIn={"zoomIn"}
//         animationOut={"zoomOut"}
//         backdropColor="transparent"
//         onBackButtonPress={() => setVisible(false)}
//         onBackdropPress={() => setVisible(false)}
//       >
//         <View style={styles.CalenderView}>
//           <Calendar
//             onDayPress={(day) => {
//               setDate(day.dateString);
//               setVisible(false);
//             }}
//             markedDates={{
//               [date]: { selected: true, selectedColor: Colors.primary },
//             }}
//             theme={{
//               selectedDayBackgroundColor: Colors.primary,
//               todayTextColor: Colors.primary,
//               arrowColor: Colors.primary,
//             }}
//           />
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//   },
//   DateShowContainer: {
//     width: "82%",
//     height: 50,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: Colors.primary,
//     paddingHorizontal: 15,
//     alignItems: "center",
//     flexDirection: "row",
//     gap: 10,
//     backgroundColor: Colors.white,
//   },
//   Icon: {
//     width: 25,
//     height: 25,
//   },
//   DarkText: {
//     fontSize: 14,
//     color: Colors.darkText,
//     fontFamily: "regular",
//   },
//   Text: {
//     fontSize: 14,
//     color: Colors.black,
//     fontFamily: "regular",
//   },
//   Calender: {
//     width: 46,
//     height: 46,
//     borderRadius: 4,
//     backgroundColor: Colors.primary,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   CalenderView: {
//     width: "100%",
//     backgroundColor: Colors.white,
//     borderRadius: 7,
//     padding: 20,
//     alignItems: "center",
//     position: "absolute",
//     top: "20%",
//     elevation: 4,
//   },
// });
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import Modal from "react-native-modal";
import { Images } from "../assets/images";
import { GlobalContextData } from "../context/GlobalContext";
import { Colors } from "../utils/colors";
import { formatDate } from "./DateFormate";

type Props = {
  date: string;
  setDate?: any;
};

// ---- Locale Settings ---- //
LocaleConfig.locales["en"] = {
  monthNames: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ],
  dayNames: [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
  ],
  dayNamesShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  today: "Today",
};

LocaleConfig.locales["nl"] = {
  monthNames: [
    "Januari", "Februari", "Maart", "April", "Mei", "Juni",
    "Juli", "Augustus", "September", "Oktober", "November", "December",
  ],
  monthNamesShort: [
    "Jan", "Feb", "Maa", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
  ],
  dayNames: [
    "Zondag", "Maandag", "Dinsdag", "Woensdag",
    "Donderdag", "Vrijdag", "Zaterdag",
  ],
  dayNamesShort: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"],
  today: "Vandaag",
};

export default function CalenderDate({ date, setDate }: Props) {
  const [IsVisible, setVisible] = useState<boolean>(false);
  const { t } = useTranslation();
  const {
    SelectLanguage,
  } = useContext(GlobalContextData);

  LocaleConfig.defaultLocale = SelectLanguage;

  useEffect(() => {
    if (!date && setDate) {
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
    }
  }, [date, setDate]);

  const today = new Date().toISOString().split("T")[0];

  return (
    <View style={styles.container}>
      {/* Date Display Box */}
      <View
        style={[
          styles.DateShowContainer,
          { borderColor: date ? Colors.primary : Colors.Boxgray },
        ]}
      >
        <Image
          source={Images.date}
          style={styles.Icon}
          tintColor={date ? Colors.primary : Colors.darkText}
        />
        {date ? (
          <Text style={styles.Text}>{formatDate(date, SelectLanguage)}</Text>
        ) : (
          <Text style={styles.DarkText}>{t("Select Date")}</Text>
        )}
      </View>

      {/* Calendar Button */}
      <View style={{width:46,height:46}}>
      <TouchableOpacity
        style={styles.Calender}
        onPress={() => setVisible(true)}
      >
        <Image source={Images.calender} style={{ width: '50%', height: '50%' }} />
      </TouchableOpacity>
      </View>

      {/* Calendar Modal */}
      <Modal
        isVisible={IsVisible}
        animationIn={"zoomIn"}
        animationOut={"zoomOut"}
        backdropColor="rgba(0,0,0,0.4)"
        onBackButtonPress={() => setVisible(false)}
        onBackdropPress={() => setVisible(false)}
      >
        <View style={styles.CalenderView}>
          <Calendar
            onDayPress={(day) => {
              setDate(day.dateString);
              setVisible(false);
            }}
            markedDates={{
              [date]: { selected: true, selectedColor: Colors.primary },
            }}
            theme={{
              backgroundColor: Colors.white,
              calendarBackground: Colors.white,
              textSectionTitleColor: Colors.darkText,
              selectedDayBackgroundColor: Colors.primary,
              selectedDayTextColor: Colors.white,
              todayTextColor: Colors.primary,
              dayTextColor: Colors.black,
              monthTextColor: Colors.black,
              textMonthFontSize: 18,
              textMonthFontWeight: "600",
              arrowColor: Colors.black,
              textDayFontSize: 15,
              textDayHeaderFontSize: 13,
              textDayFontWeight: "400",
              "stylesheet.calendar.header": {
                header: {
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginHorizontal: 10,
                  marginTop: 10,
                  marginBottom: 10,
                   
                },
                monthText: {
                  fontSize: 18,
                  fontWeight: "600",
                  color: Colors.black,
                },
              },
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

// ---- Styles ---- //
const styles = StyleSheet.create({
  container: {
    // width: width,
    width:'100%',
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // borderWidth:1
  },
  DateShowContainer: {
    flex:1/1.05,
    height: 50,
    borderRadius: 10,
    borderWidth: 1.2,
    paddingHorizontal: 15,
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
  },
  Icon: {
    width: 22,
    height: 22,
  },
  DarkText: {
    fontSize: 14,
    color: Colors.darkText,
    fontFamily: "regular",
  },
  Text: {
    fontSize: 14,
    color: Colors.black,
    fontFamily: "regular",
  },
  Calender: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  CalenderView: {
    width: "90%",
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 15,
    alignSelf: "center",
    elevation: 5,
  },
});
