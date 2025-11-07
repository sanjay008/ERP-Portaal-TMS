import React, { createContext, useState } from "react";

export const GlobalContextData = createContext<any>(null);

export default function GlobalContext({ children }: any) {
  const [UserData, setUserData] = useState<any>(null);
  const [GOOGLE_API_KEY, setGOOGLE_API_KEY] = useState<string>("");
  const [CompanyLogo, setCompanyLogo] = useState<any>(null);
  const [Permission, setPermission] = useState<any[]>([]);
  const [SelectCurrentDate,setSelectCurrentDate] = useState();
  const [SelectLanguage, setSelectLanguage] = useState<string>("");
  const [Toast, setToast] = useState({
    visible: false,
    text: "",
    type: "success",
    top: 45,
  });
  const [AllRegion, setAllRegion] = useState<any[]>([]);
  const [CompanysData, setCompanysData] = useState<string>("");

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
        SelectCurrentDate,setSelectCurrentDate
      }}
    >
      {children}
    </GlobalContextData.Provider>
  );
}
