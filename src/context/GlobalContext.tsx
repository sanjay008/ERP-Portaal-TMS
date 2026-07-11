import React, { createContext, useCallback, useState } from "react";
import apiConstants from "../api/apiConstants";
import ApiService from "../utils/Apiservice";
import { mergeCountryLists, buildFallbackOnlyList, MergedCountry } from "../utils/countryListHelper";
import type { ActiveShiftSession } from "../utils/shiftSession";
import { getData, token as appToken } from "../utils/storeData";

export const GlobalContextData = createContext<any>(null);

export default function GlobalContext({ children }: any) {
  const [UserData, setUserData] = useState<any>(null);
  const [GOOGLE_API_KEY, setGOOGLE_API_KEY] = useState<string>("");
  const [CompanyLogo, setCompanyLogo] = useState<any>(null);
  const [Permission, setPermission] = useState<any[]>([]);
  const [SelectCurrentDate, setSelectCurrentDate] = useState();
  const [SelectLanguage, setSelectLanguage] = useState<string>("");
  const [DeliveyDataSave, setDeliveyDataSave] = useState<any>(null);
  const [PickUpDataSave, setPickUpDataSave] = useState<any>(null);
  const [NoParcelDetailsScreenEvent, setNoParcelDetailsScreenEvent] = useState(false)
  const [isGpsTracking, setIsGpsTracking] = useState(false)
  const [activeShift, setActiveShift] = useState<ActiveShiftSession | null>(null);
  const [NoParcelItemIds, setNoParcelItemIds] = useState<number[]>([]);
  const [AllLanguage,setAllLanguage] = useState<any>([]);
  const [SelectDeliveryReason, setSelectDeliveryReson] = useState(null);
  const [Toast, setToast] = useState({
    visible: false,
    text: "",
    type: "success",
    top: 45,
  });
  const [AllRegion, setAllRegion] = useState<any[]>([]);
  const [CompanysData, setCompanysData] = useState<string>("");
  const [GloblyTypeSlide, setGloblyTypeSlide] = useState("");
  const [SelectActiveRegionData, setSelectActiveRegionData] = useState<any>(null);
  const [SelectActiveDate, setSelectActiveDate] = useState<any>(null);
  const [OrderDeliveryMapingLableOption, setOrderDeliveryMapingLableOption] = useState(null);
  const [TimeZone, setTimeZone] = useState<string>("");
  const [AllDeliveyLabel, setAllDeliveyLabel] = useState<any []>([]);
  const [SelectCurrentDeliveryLabel, setSelectCurrentDeliveryLabelState] = useState<any>(null);
  const setSelectCurrentDeliveryLabel = useCallback((label: any) => {
    console.log('[SelectCurrentDeliveryLabel] SET', {
      id: label?.id ?? null,
      title: label?.title ?? label?.name ?? null,
      signature_required: label?.signature_required,
      isNull: label == null,
      full: label,
    });
    // Delivery label for direct verify lives in ParcelVerifySession only.
    setSelectCurrentDeliveryLabelState(label);
  }, []);
  const [AllDamageListReason,setAllDamageListReason] = useState([]);
  const [selectRegionData, setSelectRegionData] = useState<any>(null);
  const [selectDamageData, setselectDamageData] = useState<any>(null);
  const [CommentId, setCommentId] = useState<any>(null);
  const [QRcodeSearch,setQRcodeSearch] = useState<string | number | null>(null);
  const [AllCountries, setAllCountries] = useState<MergedCountry[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [AllTmsStatusList, setAllTmsStatusList] = useState<any[]>([]);
  const [warehouseScanResume, setWarehouseScanResume] = useState<{
    orderId: number | string;
    sheetMode?: 'scan' | 'saved';
  } | null>(null);

  const fetchCountries = useCallback(async (force = false) => {
    if (!force && AllCountries.length > 0) {
      return AllCountries;
    }

    setCountriesLoading(true);
    try {
      const userData = await getData("USERDATA");
      const authToken =
        userData?.data?.user?.verify_token ??
        userData?.user?.verify_token ??
        appToken;

      const res = await ApiService(apiConstants.countryList, {
        customData: { token: authToken },
      });

      if (res?.success && Array.isArray(res?.data) && res.data.length > 0) {
        const merged = mergeCountryLists(res.data);
        setAllCountries(merged);
        return merged;
      }
    } catch {
      // use fallback below
    } finally {
      setCountriesLoading(false);
    }

    const fallback = buildFallbackOnlyList();
    setAllCountries(fallback);
    return fallback;
  }, [AllCountries.length]);

  const fetchTmsStatusList = useCallback(async (force = false) => {
    if (!force && AllTmsStatusList.length > 0) {
      return AllTmsStatusList;
    }

    if (!UserData?.user?.verify_token) {
      return [];
    }

    try {
      const res = await ApiService(apiConstants.status_list, {
        customData: {
          token: UserData.user.verify_token,
          role: UserData.user.role,
          relaties_id: UserData.relaties?.id,
          user_id: UserData.user.id,
        },
      });

      if (Boolean(res?.status)) {
        const list = Array.isArray(res?.data) ? res.data : [];
        setAllTmsStatusList(list);
        return list;
      }
    } catch {
      return AllTmsStatusList;
    }

    return [];
  }, [AllTmsStatusList, UserData]);
  
  return (
    <GlobalContextData.Provider
      value={{
        GOOGLE_API_KEY, setGOOGLE_API_KEY,
        CompanyLogo, setCompanyLogo,
        Permission, setPermission,
        SelectLanguage, setSelectLanguage,
        UserData, setUserData,
        Toast, setToast,
        AllRegion, setAllRegion,
        CompanysData, setCompanysData,
        SelectCurrentDate, setSelectCurrentDate,
        DeliveyDataSave, setDeliveyDataSave,
        GloblyTypeSlide, setGloblyTypeSlide,
        PickUpDataSave, setPickUpDataSave,
        NoParcelItemIds, setNoParcelItemIds,
        SelectActiveRegionData, setSelectActiveRegionData,
        SelectActiveDate, setSelectActiveDate,
        SelectDeliveryReason, setSelectDeliveryReson,
        OrderDeliveryMapingLableOption, setOrderDeliveryMapingLableOption,
        NoParcelDetailsScreenEvent, setNoParcelDetailsScreenEvent,
        TimeZone, setTimeZone,
        AllDeliveyLabel, setAllDeliveyLabel,
        SelectCurrentDeliveryLabel,setSelectCurrentDeliveryLabel,
        AllLanguage,
        setAllLanguage,
        AllDamageListReason,setAllDamageListReason,
        selectRegionData, setSelectRegionData,
        selectDamageData, setselectDamageData,
        CommentId, setCommentId,
        isGpsTracking, setIsGpsTracking,
        activeShift, setActiveShift,
        QRcodeSearch,setQRcodeSearch,
        AllCountries, setAllCountries,
        countriesLoading,
        fetchCountries,
        AllTmsStatusList, setAllTmsStatusList,
        fetchTmsStatusList,
        warehouseScanResume, setWarehouseScanResume,
      }}
    >
      {children}
    </GlobalContextData.Provider>
  );
}
