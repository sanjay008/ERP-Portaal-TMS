

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

// Helper: convert 'IN' => 🇮🇳
const countryCodeToFlag = (cc) =>
  cc
    ? cc
        .toUpperCase()
        .split("")
        .map((c) => String.fromCodePoint(127397 + c.charCodeAt()))
        .join("")
    : "";



const defaultStyles = StyleSheet.create({
  container: { marginVertical: 10,width: "100%", },
  inputContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    overflow: "hidden",
    height: 50,
    alignItems: "center",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderColor: "#ddd",
    justifyContent: "center",
    height: "100%",
  },
  flagText: { fontSize: 20 },
  callingCodeText: { marginLeft: 4, fontSize: 16 },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 16,
    height: "100%",
  },
  validationText: { marginTop: 4, fontSize: 14 },
  modalHeader: { padding: 12, borderBottomWidth: 1, borderColor: "#eee" },
  searchInput: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#ddd" },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderColor: "#fafafa", gap:5},
});

export default function MyCountryPiker({
  defaultCountry = "IN",
  favorites = [],
  onSelect = () => {},
  showFlag = true,
  showCallingCode = true,
  showPhoneInput = true,
  test = true,
  modalHeight = SCREEN_HEIGHT * 0.7,
  searchPlaceholder = "Search country or code",
  ContainerStyle = {},
  setValue,
  value,
  disbled=false,
  
}) {
    const countriesData =  [
  {
    "countryname": "Afghanistan",
    "countrycode": "93",
    "phoneLength": 9,
    "cca2": "AF",
    "slug": "afghanistan",
    "flag": "🇦🇫"
  },
  {
    "countryname": "Albania",
    "countrycode": "355",
    "phoneLength": 9,
    "cca2": "AL",
    "slug": "albania",
    "flag": "🇦🇱"
  },
  {
    "countryname": "Algeria",
    "countrycode": "213",
    "phoneLength": 9,
    "cca2": "DZ",
    "slug": "algeria",
    "flag": "🇩🇿"
  },
  {
    "countryname": "Andorra",
    "countrycode": "376",
    "phoneLength": 6,
    "cca2": "AD",
    "slug": "andorra",
    "flag": "🇦🇩"
  },
  {
    "countryname": "Angola",
    "countrycode": "244",
    "phoneLength": 9,
    "cca2": "AO",
    "slug": "angola",
    "flag": "🇦🇴"
  },
  {
    "countryname": "Argentina",
    "countrycode": "54",
    "phoneLength": 10,
    "cca2": "AR",
    "slug": "argentina",
    "flag": "🇦🇷"
  },
  {
    "countryname": "Armenia",
    "countrycode": "374",
    "phoneLength": 8,
    "cca2": "AM",
    "slug": "armenia",
    "flag": "🇦🇲"
  },
  {
    "countryname": "Australia",
    "countrycode": "61",
    "phoneLength": 9,
    "cca2": "AU",
    "slug": "australia",
    "flag": "🇦🇺"
  },
  {
    "countryname": "Austria",
    "countrycode": "43",
    "phoneLength": 11,
    "cca2": "AT",
    "slug": "austria",
    "flag": "🇦🇹"
  },
  {
    "countryname": "Azerbaijan",
    "countrycode": "994",
    "phoneLength": 9,
    "cca2": "AZ",
    "slug": "azerbaijan",
    "flag": "🇦🇿"
  },
  {
    "countryname": "Bahamas",
    "countrycode": "1242",
    "phoneLength": 10,
    "cca2": "BS",
    "slug": "bahamas",
    "flag": "🇧🇸"
  },
  {
    "countryname": "Bahrain",
    "countrycode": "973",
    "phoneLength": 8,
    "cca2": "BH",
    "slug": "bahrain",
    "flag": "🇧🇭"
  },
  {
    "countryname": "Bangladesh",
    "countrycode": "880",
    "phoneLength": 10,
    "cca2": "BD",
    "slug": "bangladesh",
    "flag": "🇧🇩"
  },
  {
    "countryname": "Belarus",
    "countrycode": "375",
    "phoneLength": 9,
    "cca2": "BY",
    "slug": "belarus",
    "flag": "🇧🇾"
  },
  {
    "countryname": "Belgium",
    "countrycode": "32",
    "phoneLength": 9,
    "cca2": "BE",
    "slug": "belgium",
    "flag": "🇧🇪"
  },
  {
    "countryname": "Belize",
    "countrycode": "501",
    "phoneLength": 7,
    "cca2": "BZ",
    "slug": "belize",
    "flag": "🇧🇿"
  },
  {
    "countryname": "Benin",
    "countrycode": "229",
    "phoneLength": 8,
    "cca2": "BJ",
    "slug": "benin",
    "flag": "🇧🇯"
  },
  {
    "countryname": "Bhutan",
    "countrycode": "975",
    "phoneLength": 8,
    "cca2": "BT",
    "slug": "bhutan",
    "flag": "🇧🇹"
  },
  {
    "countryname": "Bolivia",
    "countrycode": "591",
    "phoneLength": 8,
    "cca2": "BO",
    "slug": "bolivia",
    "flag": "🇧🇴"
  },
  {
    "countryname": "Bosnia and Herzegovina",
    "countrycode": "387",
    "phoneLength": 8,
    "cca2": "BA",
    "slug": "bosnia-herzegovina",
    "flag": "🇧🇦"
  },
  {
    "countryname": "Botswana",
    "countrycode": "267",
    "phoneLength": 8,
    "cca2": "BW",
    "slug": "botswana",
    "flag": "🇧🇼"
  },
  {
    "countryname": "Brazil",
    "countrycode": "55",
    "phoneLength": 11,
    "cca2": "BR",
    "slug": "brazil",
    "flag": "🇧🇷"
  },
  {
    "countryname": "Brunei",
    "countrycode": "673",
    "phoneLength": 7,
    "cca2": "BN",
    "slug": "brunei",
    "flag": "🇧🇳"
  },
  {
    "countryname": "Bulgaria",
    "countrycode": "359",
    "phoneLength": 9,
    "cca2": "BG",
    "slug": "bulgaria",
    "flag": "🇧🇬"
  },
  {
    "countryname": "Burkina Faso",
    "countrycode": "226",
    "phoneLength": 8,
    "cca2": "BF",
    "slug": "burkina-faso",
    "flag": "🇧🇫"
  },
  {
    "countryname": "Burundi",
    "countrycode": "257",
    "phoneLength": 8,
    "cca2": "BI",
    "slug": "burundi",
    "flag": "🇧🇮"
  },
  {
    "countryname": "Cambodia",
    "countrycode": "855",
    "phoneLength": 9,
    "cca2": "KH",
    "slug": "cambodia",
    "flag": "🇰🇭"
  },
  {
    "countryname": "Cameroon",
    "countrycode": "237",
    "phoneLength": 9,
    "cca2": "CM",
    "slug": "cameroon",
    "flag": "🇨🇲"
  },
  {
    "countryname": "Canada",
    "countrycode": "1",
    "phoneLength": 10,
    "cca2": "CA",
    "slug": "canada",
    "flag": "🇨🇦"
  },
  {
    "countryname": "Cape Verde",
    "countrycode": "238",
    "phoneLength": 7,
    "cca2": "CV",
    "slug": "cape-verde",
    "flag": "🇨🇻"
  },
  {
    "countryname": "Central African Republic",
    "countrycode": "236",
    "phoneLength": 8,
    "cca2": "CF",
    "slug": "central-african-republic",
    "flag": "🇨🇫"
  },
  {
    "countryname": "Chad",
    "countrycode": "235",
    "phoneLength": 8,
    "cca2": "TD",
    "slug": "chad",
    "flag": "🇹🇩"
  },
  {
    "countryname": "Chile",
    "countrycode": "56",
    "phoneLength": 9,
    "cca2": "CL",
    "slug": "chile",
    "flag": "🇨🇱"
  },
  {
    "countryname": "China",
    "countrycode": "86",
    "phoneLength": 11,
    "cca2": "CN",
    "slug": "china",
    "flag": "🇨🇳"
  },
  {
    "countryname": "Colombia",
    "countrycode": "57",
    "phoneLength": 10,
    "cca2": "CO",
    "slug": "colombia",
    "flag": "🇨🇴"
  },
  {
    "countryname": "Comoros",
    "countrycode": "269",
    "phoneLength": 7,
    "cca2": "KM",
    "slug": "comoros",
    "flag": "🇰🇲"
  },
  {
    "countryname": "Costa Rica",
    "countrycode": "506",
    "phoneLength": 8,
    "cca2": "CR",
    "slug": "costa-rica",
    "flag": "🇨🇷"
  },
  {
    "countryname": "Croatia",
    "countrycode": "385",
    "phoneLength": 9,
    "cca2": "HR",
    "slug": "croatia",
    "flag": "🇭🇷"
  },
  {
    "countryname": "Cuba",
    "countrycode": "53",
    "phoneLength": 8,
    "cca2": "CU",
    "slug": "cuba",
    "flag": "🇨🇺"
  },
  {
    "countryname": "Cyprus",
    "countrycode": "357",
    "phoneLength": 8,
    "cca2": "CY",
    "slug": "cyprus",
    "flag": "🇨🇾"
  },
  {
    "countryname": "Czech Republic",
    "countrycode": "420",
    "phoneLength": 9,
    "cca2": "CZ",
    "slug": "czech-republic",
    "flag": "🇨🇿"
  },
  {
    "countryname": "Denmark",
    "countrycode": "45",
    "phoneLength": 8,
    "cca2": "DK",
    "slug": "denmark",
    "flag": "🇩🇰"
  },
  {
    "countryname": "Djibouti",
    "countrycode": "253",
    "phoneLength": 8,
    "cca2": "DJ",
    "slug": "djibouti",
    "flag": "🇩🇯"
  },
  {
    "countryname": "Dominican Republic",
    "countrycode": "1809",
    "phoneLength": 10,
    "cca2": "DO",
    "slug": "dominican-republic",
    "flag": "🇩🇴"
  },
  {
    "countryname": "DR Congo",
    "countrycode": "243",
    "phoneLength": 9,
    "cca2": "CD",
    "slug": "dr-congo",
    "flag": "🇨🇩"
  },
  {
    "countryname": "Ecuador",
    "countrycode": "593",
    "phoneLength": 9,
    "cca2": "EC",
    "slug": "ecuador",
    "flag": "🇪🇨"
  },
  {
    "countryname": "Egypt",
    "countrycode": "20",
    "phoneLength": 10,
    "cca2": "EG",
    "slug": "egypt",
    "flag": "🇪🇬"
  },
  {
    "countryname": "El Salvador",
    "countrycode": "503",
    "phoneLength": 8,
    "cca2": "SV",
    "slug": "el-salvador",
    "flag": "🇸🇻"
  },
  {
    "countryname": "Estonia",
    "countrycode": "372",
    "phoneLength": 8,
    "cca2": "EE",
    "slug": "estonia",
    "flag": "🇪🇪"
  },
  {
    "countryname": "Ethiopia",
    "countrycode": "251",
    "phoneLength": 9,
    "cca2": "ET",
    "slug": "ethiopia",
    "flag": "🇪🇹"
  },
  {
    "countryname": "Fiji",
    "countrycode": "679",
    "phoneLength": 7,
    "cca2": "FJ",
    "slug": "fiji",
    "flag": "🇫🇯"
  },
  {
    "countryname": "Finland",
    "countrycode": "358",
    "phoneLength": 9,
    "cca2": "FI",
    "slug": "finland",
    "flag": "🇫🇮"
  },
  {
    "countryname": "France",
    "countrycode": "33",
    "phoneLength": 9,
    "cca2": "FR",
    "slug": "france",
    "flag": "🇫🇷"
  },
  {
    "countryname": "Gabon",
    "countrycode": "241",
    "phoneLength": 7,
    "cca2": "GA",
    "slug": "gabon",
    "flag": "🇬🇦"
  },
  {
    "countryname": "Gambia",
    "countrycode": "220",
    "phoneLength": 7,
    "cca2": "GM",
    "slug": "gambia",
    "flag": "🇬🇲"
  },
  {
    "countryname": "Georgia",
    "countrycode": "995",
    "phoneLength": 9,
    "cca2": "GE",
    "slug": "georgia",
    "flag": "🇬🇪"
  },
  {
    "countryname": "Djibouti",
    "countrycode": "253",
    "phoneLength": 8,
    "cca2": "DJ",
    "slug": "djibouti",
    "flag": "🇩🇯"
  },
  {
    "countryname": "Dominica",
    "countrycode": "1767",
    "phoneLength": 10,
    "cca2": "DM",
    "slug": "dominica",
    "flag": "🇩🇲"
  },
  {
    "countryname": "Dominican Republic",
    "countrycode": "1809",
    "phoneLength": 10,
    "cca2": "DO",
    "slug": "dominican-republic",
    "flag": "🇩🇴"
  },
  {
    "countryname": "Ecuador",
    "countrycode": "593",
    "phoneLength": 9,
    "cca2": "EC",
    "slug": "ecuador",
    "flag": "🇪🇨"
  },
  {
    "countryname": "Egypt",
    "countrycode": "20",
    "phoneLength": 10,
    "cca2": "EG",
    "slug": "egypt",
    "flag": "🇪🇬"
  },
  {
    "countryname": "El Salvador",
    "countrycode": "503",
    "phoneLength": 8,
    "cca2": "SV",
    "slug": "el-salvador",
    "flag": "🇸🇻"
  },
  {
    "countryname": "Equatorial Guinea",
    "countrycode": "240",
    "phoneLength": 9,
    "cca2": "GQ",
    "slug": "equatorial-guinea",
    "flag": "🇬🇶"
  },
  {
    "countryname": "Eritrea",
    "countrycode": "291",
    "phoneLength": 7,
    "cca2": "ER",
    "slug": "eritrea",
    "flag": "🇪🇷"
  },
  {
    "countryname": "Estonia",
    "countrycode": "372",
    "phoneLength": 8,
    "cca2": "EE",
    "slug": "estonia",
    "flag": "🇪🇪"
  },
  {
    "countryname": "Eswatini",
    "countrycode": "268",
    "phoneLength": 8,
    "cca2": "SZ",
    "slug": "eswatini",
    "flag": "🇸🇿"
  },
  {
    "countryname": "Ethiopia",
    "countrycode": "251",
    "phoneLength": 9,
    "cca2": "ET",
    "slug": "ethiopia",
    "flag": "🇪🇹"
  },
  {
    "countryname": "Fiji",
    "countrycode": "679",
    "phoneLength": 7,
    "cca2": "FJ",
    "slug": "fiji",
    "flag": "🇫🇯"
  },
  {
    "countryname": "Finland",
    "countrycode": "358",
    "phoneLength": 9,
    "cca2": "FI",
    "slug": "finland",
    "flag": "🇫🇮"
  },
  {
    "countryname": "France",
    "countrycode": "33",
    "phoneLength": 9,
    "cca2": "FR",
    "slug": "france",
    "flag": "🇫🇷"
  },
  {
    "countryname": "Gabon",
    "countrycode": "241",
    "phoneLength": 7,
    "cca2": "GA",
    "slug": "gabon",
    "flag": "🇬🇦"
  },
  {
    "countryname": "Gambia",
    "countrycode": "220",
    "phoneLength": 7,
    "cca2": "GM",
    "slug": "gambia",
    "flag": "🇬🇲"
  },
  {
    "countryname": "Georgia",
    "countrycode": "995",
    "phoneLength": 9,
    "cca2": "GE",
    "slug": "georgia",
    "flag": "🇬🇪"
  },
  {
    "countryname": "Germany",
    "countrycode": "49",
    "phoneLength": 10,
    "cca2": "DE",
    "slug": "germany",
    "flag": "🇩🇪"
  },
  {
    "countryname": "Ghana",
    "countrycode": "233",
    "phoneLength": 9,
    "cca2": "GH",
    "slug": "ghana",
    "flag": "🇬🇭"
  },
  {
    "countryname": "Greece",
    "countrycode": "30",
    "phoneLength": 10,
    "cca2": "GR",
    "slug": "greece",
    "flag": "🇬🇷"
  },
  {
    "countryname": "Grenada",
    "countrycode": "1473",
    "phoneLength": 10,
    "cca2": "GD",
    "slug": "grenada",
    "flag": "🇬🇩"
  },
  {
    "countryname": "Guatemala",
    "countrycode": "502",
    "phoneLength": 8,
    "cca2": "GT",
    "slug": "guatemala",
    "flag": "🇬🇹"
  },
  {
    "countryname": "Guinea",
    "countrycode": "224",
    "phoneLength": 9,
    "cca2": "GN",
    "slug": "guinea",
    "flag": "🇬🇳"
  },
  {
    "countryname": "Guinea-Bissau",
    "countrycode": "245",
    "phoneLength": 7,
    "cca2": "GW",
    "slug": "guinea-bissau",
    "flag": "🇬🇼"
  },
  {
    "countryname": "Guyana",
    "countrycode": "592",
    "phoneLength": 7,
    "cca2": "GY",
    "slug": "guyana",
    "flag": "🇬🇾"
  },
  {
    "countryname": "Haiti",
    "countrycode": "509",
    "phoneLength": 8,
    "cca2": "HT",
    "slug": "haiti",
    "flag": "🇭🇹"
  },
  {
    "countryname": "Honduras",
    "countrycode": "504",
    "phoneLength": 8,
    "cca2": "HN",
    "slug": "honduras",
    "flag": "🇭🇳"
  },
  {
    "countryname": "Hong Kong",
    "countrycode": "852",
    "phoneLength": 8,
    "cca2": "HK",
    "slug": "hong-kong",
    "flag": "🇭🇰"
  },
  {
    "countryname": "Hungary",
    "countrycode": "36",
    "phoneLength": 9,
    "cca2": "HU",
    "slug": "hungary",
    "flag": "🇭🇺"
  },
  {
    "countryname": "Iceland",
    "countrycode": "354",
    "phoneLength": 7,
    "cca2": "IS",
    "slug": "iceland",
    "flag": "🇮🇸"
  },
  {
    "countryname": "India",
    "countrycode": "91",
    "phoneLength": 10,
    "cca2": "IN",
    "slug": "india",
    "flag": "🇮🇳"
  },
  {
    "countryname": "Indonesia",
    "countrycode": "62",
    "phoneLength": 10,
    "cca2": "ID",
    "slug": "indonesia",
    "flag": "🇮🇩"
  },
  {
    "countryname": "Iran",
    "countrycode": "98",
    "phoneLength": 10,
    "cca2": "IR",
    "slug": "iran",
    "flag": "🇮🇷"
  },
  {
    "countryname": "Iraq",
    "countrycode": "964",
    "phoneLength": 10,
    "cca2": "IQ",
    "slug": "iraq",
    "flag": "🇮🇶"
  },
  {
    "countryname": "Ireland",
    "countrycode": "353",
    "phoneLength": 9,
    "cca2": "IE",
    "slug": "ireland",
    "flag": "🇮🇪"
  },
  {
    "countryname": "Israel",
    "countrycode": "972",
    "phoneLength": 9,
    "cca2": "IL",
    "slug": "israel",
    "flag": "🇮🇱"
  },
  {
    "countryname": "Italy",
    "countrycode": "39",
    "phoneLength": 10,
    "cca2": "IT",
    "slug": "italy",
    "flag": "🇮🇹"
  },
  {
    "countryname": "Jamaica",
    "countrycode": "1876",
    "phoneLength": 10,
    "cca2": "JM",
    "slug": "jamaica",
    "flag": "🇯🇲"
  },
  {
    "countryname": "Japan",
    "countrycode": "81",
    "phoneLength": 10,
    "cca2": "JP",
    "slug": "japan",
    "flag": "🇯🇵"
  },
  {
    "countryname": "Jordan",
    "countrycode": "962",
    "phoneLength": 9,
    "cca2": "JO",
    "slug": "jordan",
    "flag": "🇯🇴"
  },
  {
    "countryname": "Kazakhstan",
    "countrycode": "7",
    "phoneLength": 10,
    "cca2": "KZ",
    "slug": "kazakhstan",
    "flag": "🇰🇿"
  },
  {
    "countryname": "Kenya",
    "countrycode": "254",
    "phoneLength": 9,
    "cca2": "KE",
    "slug": "kenya",
    "flag": "🇰🇪"
  },
  {
    "countryname": "Kiribati",
    "countrycode": "686",
    "phoneLength": 5,
    "cca2": "KI",
    "slug": "kiribati",
    "flag": "🇰🇮"
  },
  {
    "countryname": "Kuwait",
    "countrycode": "965",
    "phoneLength": 8,
    "cca2": "KW",
    "slug": "kuwait",
    "flag": "🇰🇼"
  },
  {
    "countryname": "Kyrgyzstan",
    "countrycode": "996",
    "phoneLength": 9,
    "cca2": "KG",
    "slug": "kyrgyzstan",
    "flag": "🇰🇬"
  },
  {
    "countryname": "Laos",
    "countrycode": "856",
    "phoneLength": 10,
    "cca2": "LA",
    "slug": "laos",
    "flag": "🇱🇦"
  },
  {
    "countryname": "Latvia",
    "countrycode": "371",
    "phoneLength": 8,
    "cca2": "LV",
    "slug": "latvia",
    "flag": "🇱🇻"
  },
  {
    "countryname": "Lebanon",
    "countrycode": "961",
    "phoneLength": 8,
    "cca2": "LB",
    "slug": "lebanon",
    "flag": "🇱🇧"
  },
  {
    "countryname": "Lesotho",
    "countrycode": "266",
    "phoneLength": 8,
    "cca2": "LS",
    "slug": "lesotho",
    "flag": "🇱🇸"
  },
  {
    "countryname": "Liberia",
    "countrycode": "231",
    "phoneLength": 8,
    "cca2": "LR",
    "slug": "liberia",
    "flag": "🇱🇷"
  },
  {
    "countryname": "Libya",
    "countrycode": "218",
    "phoneLength": 9,
    "cca2": "LY",
    "slug": "libya",
    "flag": "🇱🇾"
  },
  {
    "countryname": "Liechtenstein",
    "countrycode": "423",
    "phoneLength": 7,
    "cca2": "LI",
    "slug": "liechtenstein",
    "flag": "🇱🇮"
  },
  {
    "countryname": "Lithuania",
    "countrycode": "370",
    "phoneLength": 8,
    "cca2": "LT",
    "slug": "lithuania",
    "flag": "🇱🇹"
  },
  {
    "countryname": "Luxembourg",
    "countrycode": "352",
    "phoneLength": 9,
    "cca2": "LU",
    "slug": "luxembourg",
    "flag": "🇱🇺"
  },
  {
    "countryname": "Macau",
    "countrycode": "853",
    "phoneLength": 8,
    "cca2": "MO",
    "slug": "macau",
    "flag": "🇲🇴"
  },
  {
    "countryname": "Madagascar",
    "countrycode": "261",
    "phoneLength": 9,
    "cca2": "MG",
    "slug": "madagascar",
    "flag": "🇲🇬"
  },
  {
    "countryname": "Malawi",
    "countrycode": "265",
    "phoneLength": 9,
    "cca2": "MW",
    "slug": "malawi",
    "flag": "🇲🇼"
  },
  {
    "countryname": "Malaysia",
    "countrycode": "60",
    "phoneLength": 9,
    "cca2": "MY",
    "slug": "malaysia",
    "flag": "🇲🇾"
  },
  {
    "countryname": "Maldives",
    "countrycode": "960",
    "phoneLength": 7,
    "cca2": "MV",
    "slug": "maldives",
    "flag": "🇲🇻"
  },
  {
    "countryname": "Mali",
    "countrycode": "223",
    "phoneLength": 8,
    "cca2": "ML",
    "slug": "mali",
    "flag": "🇲🇱"
  },
  {
    "countryname": "Malta",
    "countrycode": "356",
    "phoneLength": 8,
    "cca2": "MT",
    "slug": "malta",
    "flag": "🇲🇹"
  },
  {
    "countryname": "Marshall Islands",
    "countrycode": "692",
    "phoneLength": 7,
    "cca2": "MH",
    "slug": "marshall-islands",
    "flag": "🇲🇭"
  },
  {
    "countryname": "Mauritania",
    "countrycode": "222",
    "phoneLength": 8,
    "cca2": "MR",
    "slug": "mauritania",
    "flag": "🇲🇷"
  },
  {
    "countryname": "Mauritius",
    "countrycode": "230",
    "phoneLength": 7,
    "cca2": "MU",
    "slug": "mauritius",
    "flag": "🇲🇺"
  },
  {
    "countryname": "Mexico",
    "countrycode": "52",
    "phoneLength": 10,
    "cca2": "MX",
    "slug": "mexico",
    "flag": "🇲🇽"
  },
  {
    "countryname": "Micronesia",
    "countrycode": "691",
    "phoneLength": 7,
    "cca2": "FM",
    "slug": "micronesia",
    "flag": "🇫🇲"
  },
  {
    "countryname": "Moldova",
    "countrycode": "373",
    "phoneLength": 8,
    "cca2": "MD",
    "slug": "moldova",
    "flag": "🇲🇩"
  },
  {
    "countryname": "Monaco",
    "countrycode": "377",
    "phoneLength": 8,
    "cca2": "MC",
    "slug": "monaco",
    "flag": "🇲🇨"
  },
  {
    "countryname": "Mongolia",
    "countrycode": "976",
    "phoneLength": 8,
    "cca2": "MN",
    "slug": "mongolia",
    "flag": "🇲🇳"
  },
  {
    "countryname": "Montenegro",
    "countrycode": "382",
    "phoneLength": 8,
    "cca2": "ME",
    "slug": "montenegro",
    "flag": "🇲🇪"
  },
  {
    "countryname": "Morocco",
    "countrycode": "212",
    "phoneLength": 9,
    "cca2": "MA",
    "slug": "morocco",
    "flag": "🇲🇦"
  },
  {
    "countryname": "Mozambique",
    "countrycode": "258",
    "phoneLength": 9,
    "cca2": "MZ",
    "slug": "mozambique",
    "flag": "🇲🇿"
  },
  {
    "countryname": "Myanmar",
    "countrycode": "95",
    "phoneLength": 10,
    "cca2": "MM",
    "slug": "myanmar",
    "flag": "🇲🇲"
  },
  {
    "countryname": "Namibia",
    "countrycode": "264",
    "phoneLength": 9,
    "cca2": "NA",
    "slug": "namibia",
    "flag": "🇳🇦"
  },
  {
    "countryname": "Nauru",
    "countrycode": "674",
    "phoneLength": 7,
    "cca2": "NR",
    "slug": "nauru",
    "flag": "🇳🇷"
  },
  {
    "countryname": "Nepal",
    "countrycode": "977",
    "phoneLength": 10,
    "cca2": "NP",
    "slug": "nepal",
    "flag": "🇳🇵"
  },
  {
    "countryname": "Netherlands",
    "countrycode": "31",
    "phoneLength": 9,
    "cca2": "NL",
    "slug": "netherlands",
    "flag": "🇳🇱"
  },
  {
    "countryname": "New Zealand",
    "countrycode": "64",
    "phoneLength": 9,
    "cca2": "NZ",
    "slug": "new-zealand",
    "flag": "🇳🇿"
  },
  {
    "countryname": "Nicaragua",
    "countrycode": "505",
    "phoneLength": 8,
    "cca2": "NI",
    "slug": "nicaragua",
    "flag": "🇳🇮"
  },
  {
    "countryname": "Niger",
    "countrycode": "227",
    "phoneLength": 8,
    "cca2": "NE",
    "slug": "niger",
    "flag": "🇳🇪"
  },
  {
    "countryname": "Nigeria",
    "countrycode": "234",
    "phoneLength": 10,
    "cca2": "NG",
    "slug": "nigeria",
    "flag": "🇳🇬"
  },
  {
    "countryname": "North Korea",
    "countrycode": "850",
    "phoneLength": 10,
    "cca2": "KP",
    "slug": "north-korea",
    "flag": "🇰🇵"
  },
  {
    "countryname": "North Macedonia",
    "countrycode": "389",
    "phoneLength": 8,
    "cca2": "MK",
    "slug": "north-macedonia",
    "flag": "🇲🇰"
  },
  {
    "countryname": "Norway",
    "countrycode": "47",
    "phoneLength": 8,
    "cca2": "NO",
    "slug": "norway",
    "flag": "🇳🇴"
  },
  {
    "countryname": "Oman",
    "countrycode": "968",
    "phoneLength": 8,
    "cca2": "OM",
    "slug": "oman",
    "flag": "🇴🇲"
  },
  {
    "countryname": "Pakistan",
    "countrycode": "92",
    "phoneLength": 10,
    "cca2": "PK",
    "slug": "pakistan",
    "flag": "🇵🇰"
  },
  {
    "countryname": "Palau",
    "countrycode": "680",
    "phoneLength": 7,
    "cca2": "PW",
    "slug": "palau",
    "flag": "🇵🇼"
  },
  {
    "countryname": "Panama",
    "countrycode": "507",
    "phoneLength": 8,
    "cca2": "PA",
    "slug": "panama",
    "flag": "🇵🇦"
  },
  {
    "countryname": "Papua New Guinea",
    "countrycode": "675",
    "phoneLength": 7,
    "cca2": "PG",
    "slug": "papua-new-guinea",
    "flag": "🇵🇬"
  },
  {
    "countryname": "Paraguay",
    "countrycode": "595",
    "phoneLength": 9,
    "cca2": "PY",
    "slug": "paraguay",
    "flag": "🇵🇾"
  },
  {
    "countryname": "Peru",
    "countrycode": "51",
    "phoneLength": 9,
    "cca2": "PE",
    "slug": "peru",
    "flag": "🇵🇪"
  },
  {
    "countryname": "Philippines",
    "countrycode": "63",
    "phoneLength": 10,
    "cca2": "PH",
    "slug": "philippines",
    "flag": "🇵🇭"
  },
  {
    "countryname": "Poland",
    "countrycode": "48",
    "phoneLength": 9,
    "cca2": "PL",
    "slug": "poland",
    "flag": "🇵🇱"
  },
  {
    "countryname": "Portugal",
    "countrycode": "351",
    "phoneLength": 9,
    "cca2": "PT",
    "slug": "portugal",
    "flag": "🇵🇹"
  },
  {
    "countryname": "Qatar",
    "countrycode": "974",
    "phoneLength": 8,
    "cca2": "QA",
    "slug": "qatar",
    "flag": "🇶🇦"
  },
  {
    "countryname": "Romania",
    "countrycode": "40",
    "phoneLength": 10,
    "cca2": "RO",
    "slug": "romania",
    "flag": "🇷🇴"
  },
  {
    "countryname": "Russia",
    "countrycode": "7",
    "phoneLength": 10,
    "cca2": "RU",
    "slug": "russia",
    "flag": "🇷🇺"
  },
  {
    "countryname": "Rwanda",
    "countrycode": "250",
    "phoneLength": 9,
    "cca2": "RW",
    "slug": "rwanda",
    "flag": "🇷🇼"
  },
  {
    "countryname": "Saint Kitts and Nevis",
    "countrycode": "1869",
    "phoneLength": 10,
    "cca2": "KN",
    "slug": "saint-kitts-and-nevis",
    "flag": "🇰🇳"
  },
  {
    "countryname": "Saint Lucia",
    "countrycode": "1758",
    "phoneLength": 10,
    "cca2": "LC",
    "slug": "saint-lucia",
    "flag": "🇱🇨"
  },
  {
    "countryname": "Saint Vincent and the Grenadines",
    "countrycode": "1784",
    "phoneLength": 10,
    "cca2": "VC",
    "slug": "saint-vincent-and-the-grenadines",
    "flag": "🇻🇨"
  },
  {
    "countryname": "Samoa",
    "countrycode": "685",
    "phoneLength": 7,
    "cca2": "WS",
    "slug": "samoa",
    "flag": "🇼🇸"
  },
  {
    "countryname": "San Marino",
    "countrycode": "378",
    "phoneLength": 10,
    "cca2": "SM",
    "slug": "san-marino",
    "flag": "🇸🇲"
  },
  {
    "countryname": "São Tomé and Príncipe",
    "countrycode": "239",
    "phoneLength": 7,
    "cca2": "ST",
    "slug": "sao-tome-and-principe",
    "flag": "🇸🇹"
  },
  {
    "countryname": "Saudi Arabia",
    "countrycode": "966",
    "phoneLength": 9,
    "cca2": "SA",
    "slug": "saudi-arabia",
    "flag": "🇸🇦"
  },
  {
    "countryname": "Senegal",
    "countrycode": "221",
    "phoneLength": 9,
    "cca2": "SN",
    "slug": "senegal",
    "flag": "🇸🇳"
  },
  {
    "countryname": "Serbia",
    "countrycode": "381",
    "phoneLength": 9,
    "cca2": "RS",
    "slug": "serbia",
    "flag": "🇷🇸"
  },
  {
    "countryname": "Seychelles",
    "countrycode": "248",
    "phoneLength": 7,
    "cca2": "SC",
    "slug": "seychelles",
    "flag": "🇸🇨"
  },
  {
    "countryname": "Sierra Leone",
    "countrycode": "232",
    "phoneLength": 8,
    "cca2": "SL",
    "slug": "sierra-leone",
    "flag": "🇸🇱"
  },
  {
    "countryname": "Singapore",
    "countrycode": "65",
    "phoneLength": 8,
    "cca2": "SG",
    "slug": "singapore",
    "flag": "🇸🇬"
  },
  {
    "countryname": "Slovakia",
    "countrycode": "421",
    "phoneLength": 9,
    "cca2": "SK",
    "slug": "slovakia",
    "flag": "🇸🇰"
  },
  {
    "countryname": "Slovenia",
    "countrycode": "386",
    "phoneLength": 9,
    "cca2": "SI",
    "slug": "slovenia",
    "flag": "🇸🇮"
  },
  {
    "countryname": "Solomon Islands",
    "countrycode": "677",
    "phoneLength": 7,
    "cca2": "SB",
    "slug": "solomon-islands",
    "flag": "🇸🇧"
  },
  {
    "countryname": "Somalia",
    "countrycode": "252",
    "phoneLength": 9,
    "cca2": "SO",
    "slug": "somalia",
    "flag": "🇸🇴"
  },
  {
    "countryname": "South Africa",
    "countrycode": "27",
    "phoneLength": 9,
    "cca2": "ZA",
    "slug": "south-africa",
    "flag": "🇿🇦"
  },
  {
    "countryname": "South Korea",
    "countrycode": "82",
    "phoneLength": 10,
    "cca2": "KR",
    "slug": "south-korea",
    "flag": "🇰🇷"
  },
  {
    "countryname": "South Sudan",
    "countrycode": "211",
    "phoneLength": 9,
    "cca2": "SS",
    "slug": "south-sudan",
    "flag": "🇸🇸"
  },
  {
    "countryname": "Spain",
    "countrycode": "34",
    "phoneLength": 9,
    "cca2": "ES",
    "slug": "spain",
    "flag": "🇪🇸"
  },
  {
    "countryname": "Sri Lanka",
    "countrycode": "94",
    "phoneLength": 9,
    "cca2": "LK",
    "slug": "sri-lanka",
    "flag": "🇱🇰"
  },
  {
    "countryname": "Sudan",
    "countrycode": "249",
    "phoneLength": 9,
    "cca2": "SD",
    "slug": "sudan",
    "flag": "🇸🇩"
  },
  {
    "countryname": "Suriname",
    "countrycode": "597",
    "phoneLength": 7,
    "cca2": "SR",
    "slug": "suriname",
    "flag": "🇸🇷"
  },
  {
    "countryname": "Sweden",
    "countrycode": "46",
    "phoneLength": 9,
    "cca2": "SE",
    "slug": "sweden",
    "flag": "🇸🇪"
  },
  {
    "countryname": "Switzerland",
    "countrycode": "41",
    "phoneLength": 9,
    "cca2": "CH",
    "slug": "switzerland",
    "flag": "🇨🇭"
  },
  {
    "countryname": "Syria",
    "countrycode": "963",
    "phoneLength": 9,
    "cca2": "SY",
    "slug": "syria",
    "flag": "🇸🇾"
  },
  {
    "countryname": "Taiwan",
    "countrycode": "886",
    "phoneLength": 9,
    "cca2": "TW",
    "slug": "taiwan",
    "flag": "🇹🇼"
  },
  {
    "countryname": "Tajikistan",
    "countrycode": "992",
    "phoneLength": 9,
    "cca2": "TJ",
    "slug": "tajikistan",
    "flag": "🇹🇯"
  },
  {
    "countryname": "Tanzania",
    "countrycode": "255",
    "phoneLength": 9,
    "cca2": "TZ",
    "slug": "tanzania",
    "flag": "🇹🇿"
  },
  {
    "countryname": "Thailand",
    "countrycode": "66",
    "phoneLength": 9,
    "cca2": "TH",
    "slug": "thailand",
    "flag": "🇹🇭"
  },
  {
    "countryname": "Togo",
    "countrycode": "228",
    "phoneLength": 8,
    "cca2": "TG",
    "slug": "togo",
    "flag": "🇹🇬"
  },
  {
    "countryname": "Tonga",
    "countrycode": "676",
    "phoneLength": 7,
    "cca2": "TO",
    "slug": "tonga",
    "flag": "🇹🇴"
  },
  {
    "countryname": "Trinidad and Tobago",
    "countrycode": "1868",
    "phoneLength": 10,
    "cca2": "TT",
    "slug": "trinidad-and-tobago",
    "flag": "🇹🇹"
  },
  {
    "countryname": "Tunisia",
    "countrycode": "216",
    "phoneLength": 8,
    "cca2": "TN",
    "slug": "tunisia",
    "flag": "🇹🇳"
  },
  {
    "countryname": "Turkey",
    "countrycode": "90",
    "phoneLength": 10,
    "cca2": "TR",
    "slug": "turkey",
    "flag": "🇹🇷"
  },
  {
    "countryname": "Turkmenistan",
    "countrycode": "993",
    "phoneLength": 8,
    "cca2": "TM",
    "slug": "turkmenistan",
    "flag": "🇹🇲"
  },
  {
    "countryname": "Tuvalu",
    "countrycode": "688",
    "phoneLength": 5,
    "cca2": "TV",
    "slug": "tuvalu",
    "flag": "🇹🇻"
  },
  {
    "countryname": "Uganda",
    "countrycode": "256",
    "phoneLength": 9,
    "cca2": "UG",
    "slug": "uganda",
    "flag": "🇺🇬"
  },
  {
    "countryname": "Ukraine",
    "countrycode": "380",
    "phoneLength": 9,
    "cca2": "UA",
    "slug": "ukraine",
    "flag": "🇺🇦"
  },
  {
    "countryname": "United Arab Emirates",
    "countrycode": "971",
    "phoneLength": 9,
    "cca2": "AE",
    "slug": "united-arab-emirates",
    "flag": "🇦🇪"
  },
  {
    "countryname": "United Kingdom",
    "countrycode": "44",
    "phoneLength": 10,
    "cca2": "GB",
    "slug": "united-kingdom",
    "flag": "🇬🇧"
  },
  {
    "countryname": "United States",
    "countrycode": "1",
    "phoneLength": 10,
    "cca2": "US",
    "slug": "united-states",
    "flag": "🇺🇸"
  },
  {
    "countryname": "Uruguay",
    "countrycode": "598",
    "phoneLength": 8,
    "cca2": "UY",
    "slug": "uruguay",
    "flag": "🇺🇾"
  },
  {
    "countryname": "Uzbekistan",
    "countrycode": "998",
    "phoneLength": 9,
    "cca2": "UZ",
    "slug": "uzbekistan",
    "flag": "🇺🇿"
  },
  {
    "countryname": "Vanuatu",
    "countrycode": "678",
    "phoneLength": 7,
    "cca2": "VU",
    "slug": "vanuatu",
    "flag": "🇻🇺"
  },
  {
    "countryname": "Vatican City",
    "countrycode": "379",
    "phoneLength": 9,
    "cca2": "VA",
    "slug": "vatican-city",
    "flag": "🇻🇦"
  },
  {
    "countryname": "Venezuela",
    "countrycode": "58",
    "phoneLength": 10,
    "cca2": "VE",
    "slug": "venezuela",
    "flag": "🇻🇪"
  },
  {
    "countryname": "Vietnam",
    "countrycode": "84",
    "phoneLength": 9,
    "cca2": "VN",
    "slug": "vietnam",
    "flag": "🇻🇳"
  },
  {
    "countryname": "Yemen",
    "countrycode": "967",
    "phoneLength": 9,
    "cca2": "YE",
    "slug": "yemen",
    "flag": "🇾🇪"
  },
  {
    "countryname": "Zambia",
    "countrycode": "260",
    "phoneLength": 9,
    "cca2": "ZM",
    "slug": "zambia",
    "flag": "🇿🇲"
  },
  {
    "countryname": "Zimbabwe",
    "countrycode": "263",
    "phoneLength": 9,
    "cca2": "ZW",
    "slug": "zimbabwe",
    "flag": "🇿🇼"
  },
  {
    "countryname": "Kosovo",
    "countrycode": "383",
    "phoneLength": 8,
    "cca2": "XK",
    "slug": "kosovo",
    "flag": "🇽🇰"
  }


]
  const [selected, setSelected] = useState(
    countriesData?.find((c) => c.cca2 === defaultCountry) || countriesData[0]
  );
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const openModal = () => {
    setVisible(true);
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT - modalHeight,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };



  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false,
    }).start(() => setVisible(false));
  };

  const onPick = (c) => {
    setSelected(c);
    setPhone("");
    closeModal();
    onSelect(c);
  };
  
  useEffect(()=>{

  },[])

  const list = useMemo(() => {
    const favSet = new Set(favorites);
    const favs = countriesData.filter((c) => favSet.has(c.cca2));
    const rest = countriesData.filter((c) => !favSet.has(c.cca2));
    let merged = [...favs, ...rest];
    if (search) {
      const q = search.toLowerCase();
      merged = merged.filter(
        (c) =>
          c.countryname.toLowerCase().includes(q) ||
          c.countrycode.includes(q) ||
          c.cca2.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q)
      );
    }
    return merged;
  }, [search, favorites]);

  const renderItem = ({ item }) => (
    <TouchableOpacity style={defaultStyles.itemRow} onPress={() => onPick(item)}>
      {showFlag && <Text style={defaultStyles.flagText}>{item.flag}</Text>}
        {showCallingCode && <Text style={{ color: "#555" }}>+{item.countrycode}</Text>}
      <View style={{ marginLeft: 8 }}>
        <Text>{item.countryname}</Text>
      </View>
    </TouchableOpacity>
  );

  const getValidationMessage = () => {
    if (!test || !showPhoneInput) return null;
    if (!value) return null;
    if (value?.length === selected?.phoneLength) {
      return <Text style={[defaultStyles.validationText, { color: "green" }]}>✔ {t("Number length is valid")}</Text>;
    } else {
      return <Text style={[defaultStyles.validationText, { color: "red" }]}>✖ {t("Number should be")} {selected.phoneLength} {t("digits")}</Text>;
    }
  };

  return (
    <View style={[defaultStyles.container,]}>
      <View style={[defaultStyles.inputContainer,ContainerStyle]}>
        <TouchableOpacity disabled={disbled} style={defaultStyles.pickerButton} onPress={openModal}>
          {showFlag && <Text style={defaultStyles.flagText}>{selected.flag}</Text>}
          {showCallingCode && <Text style={defaultStyles.callingCodeText}>+{selected.countrycode}</Text>}
        </TouchableOpacity>
        {showPhoneInput && (
          <TextInput
          key={defaultCountry}
            style={defaultStyles.phoneInput}
            placeholder="Phone number"
            keyboardType="numeric"
            editable={!disbled}
            value={value}
            maxLength={selected.phoneLength}
            onChangeText={setValue}
          />
        )}
      </View>
      {getValidationMessage()}

      <Modal transparent visible={visible} animationType="none">
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeModal}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", }} />
        </TouchableOpacity>
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom:0,
            height: modalHeight,
            backgroundColor: "#fff",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}
        >
          <View style={defaultStyles.modalHeader}>
            <TextInput
              placeholder={searchPlaceholder}
              value={search}
              onChangeText={setSearch}
              style={defaultStyles.searchInput}
              autoFocus
            />
          </View>
          <FlatList
            data={list}
            keyExtractor={(item) => item.cca2 + "-" + item.countrycode}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          />
        </Animated.View>
      </Modal>
    </View>
  );
}
