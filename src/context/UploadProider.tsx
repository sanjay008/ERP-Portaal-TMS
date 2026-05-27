import React, { createContext, useState } from "react";

export const DropboxContext = createContext<any>(null);

export default function DropboxProvider({ children }: any) {
    const [AccessToken, setAccessToken] = useState<string 
    | null>(null);
    const [RefreshToken, setRefreshToken] = useState<string | null>(null);
    const [ClientId, setClientId] = useState<string | null>(null);
    const [ClientSecret, setClientSecret] = useState<string | null>(null);

  return (
    <DropboxContext.Provider
      value={{
        AccessToken,
        setAccessToken,
        RefreshToken,
        setRefreshToken,
        ClientId,
        setClientId,
        ClientSecret,
        setClientSecret,
      }}
    >
      {children}
    </DropboxContext.Provider>
  );
}
