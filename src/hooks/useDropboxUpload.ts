import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useRef, useState } from "react";

export default function useDropboxUpload({
  clientId,
  clientSecret,
  refreshToken,
  accessToken: initialAccessToken,
  setAccessToken,
  setToast,
}) {

  const [loading, setLoading] = useState(false);

  const accessTokenRef = useRef(
    initialAccessToken || ""
  );

  const showToast = useCallback((
    text = "Something went wrong"
  ) => {

    if (!setToast) return;

    setToast({
      top: 45,
      text,
      type: "error",
      visible: true,
    });

  }, [setToast]);

  const refreshAccessToken = useCallback(async () => {

    try {

      console.log(
        "Refreshing Dropbox token..."
      );

      const response = await fetch(
        "https://api.dropbox.com/oauth2/token",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },

          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }).toString(),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data?.access_token
      ) {

        showToast(
          "Dropbox token refresh failed"
        );

        throw new Error(
          data?.error_description ||
          "Failed to refresh token"
        );
      }

      accessTokenRef.current =
        data.access_token;

      setAccessToken?.(
        data.access_token
      );

      console.log(
        "Dropbox token refreshed"
      );

      return data.access_token;

    } catch (e) {

      console.log(
        "Refresh Token Error:",
        e
      );

      showToast(
        "Unable to refresh Dropbox token"
      );

      throw e;
    }

  }, [
    clientId,
    clientSecret,
    refreshToken,
    setAccessToken,
    showToast,
  ]);

  const createSharedLink = useCallback(async (
    path,
    token
  ) => {

    try {

      const response = await fetch(
        "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${token}`,

            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            path,
          }),
        }
      );

      const data =
        await response.json();

      if (data?.url) {

        return data.url.replace(
          "?dl=0",
          "?raw=1"
        );
      }

      if (
        data?.error?.[".tag"] ===
        "shared_link_already_exists"
      ) {

        const existingResponse =
          await fetch(
            "https://api.dropboxapi.com/2/sharing/list_shared_links",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                path,
                direct_only: true,
              }),
            }
          );

        const existingData =
          await existingResponse.json();

        if (
          existingData?.links?.length > 0
        ) {

          return existingData
            .links[0]
            .url.replace(
              "?dl=0",
              "?raw=1"
            );
        }
      }

      return null;

    } catch (e) {

      console.log(
        "Create Shared Link Error:",
        e
      );

      return null;
    }

  }, []);

  const uploadSingleFile = useCallback(async (
    imageUri,
    retry = 0
  ) => {

    try {

      console.log(
        "Uploading:",
        imageUri
      );

      let token =
        accessTokenRef.current;

      const fileName =
        `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 10)}.jpg`;

      const dropboxPath =
        `/photos/${fileName}`;

      let uploadRes =
        await FileSystem.uploadAsync(
          "https://content.dropboxapi.com/2/files/upload",
          imageUri,
          {
            httpMethod: "POST",

            uploadType:
              FileSystem
                .FileSystemUploadType
                .BINARY_CONTENT,

            headers: {
              Authorization:
                `Bearer ${token?.trim?.()}`,

              "Dropbox-API-Arg":
                JSON.stringify({
                  path: dropboxPath,
                  mode: "add",
                  autorename: true,
                  mute: false,
                }),

              "Content-Type":
                "application/octet-stream",
            },
          }
        );

      if (
        uploadRes.status === 401
      ) {

        console.log(
          "Token expired, refreshing..."
        );

        token =
          await refreshAccessToken();

        uploadRes =
          await FileSystem.uploadAsync(
            "https://content.dropboxapi.com/2/files/upload",
            imageUri,
            {
              httpMethod: "POST",

              uploadType:
                FileSystem
                  .FileSystemUploadType
                  .BINARY_CONTENT,

              headers: {
                Authorization:
                  `Bearer ${token?.trim?.()}`,

                "Dropbox-API-Arg":
                  JSON.stringify({
                    path: dropboxPath,
                    mode: "add",
                    autorename: true,
                    mute: false,
                  }),

                "Content-Type":
                  "application/octet-stream",
              },
            }
          );
      }

      if (
        uploadRes.status !== 200
      ) {

        console.log(
          "Upload Failed:",
          uploadRes.body
        );

        if (retry < 3) {

          console.log(
            `Retrying Upload (${retry + 1})`
          );

          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                2000
              )
          );

          return uploadSingleFile(
            imageUri,
            retry + 1
          );
        }

        showToast(
          "Image upload failed"
        );

        return;
      }

      const uploadData =
        typeof uploadRes.body ===
        "string"
          ? JSON.parse(
              uploadRes.body
            )
          : uploadRes.body;

      const publicUrl =
        await createSharedLink(
          uploadData.path_display,
          token
        );

      if (!publicUrl) {

        showToast(
          "Unable to generate image URL"
        );

        return;
      }

      console.log(
        "Upload Success URL:",
        publicUrl
      );

      return publicUrl;

    } catch (e) {

      console.log(
        "Single Upload Error:",
        e
      );

      if (retry < 3) {

        console.log(
          `Retry Upload (${retry + 1})`
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              2000
            )
        );

        return uploadSingleFile(
          imageUri,
          retry + 1
        );
      }

      showToast(
        "Server issue, please try again"
      );
    }

  }, [
    createSharedLink,
    refreshAccessToken,
    showToast,
  ]);

  const uploadToDropbox = useCallback(async (
    imageUris = []
  ) => {

    try {

      setLoading(true);

      console.log(
        "Dropbox Upload Started"
      );

      const validUris =
        imageUris.filter(Boolean);

      if (
        validUris.length === 0
      ) {

        showToast(
          "No images found"
        );

        return;
      }

      const startTime =
        Date.now();

      const results =
        await Promise.all(
          validUris.map((uri) =>
            uploadSingleFile(uri)
          )
        );

      const uploadedUrls =
        results.filter(Boolean);

      const totalTime =
        (
          (Date.now() -
            startTime) /
          1000
        ).toFixed(2);

      console.log(
        "All Upload Completed"
      );

      console.log(
        "Total Upload Time:",
        `${totalTime}s`
      );

      console.log(
        "Uploaded URLs:",
        uploadedUrls
      );

      if (
        uploadedUrls.length === 0
      ) {

        showToast(
          "All uploads failed"
        );
      }

    } catch (e) {

      console.log(
        "Dropbox Upload Error:",
        e
      );

      showToast(
        "Dropbox upload failed"
      );

    } finally {

      setLoading(false);
    }

  }, [
    uploadSingleFile,
    showToast,
  ]);

  return {
    loading,
    uploadToDropbox,
    refreshAccessToken,
  };
}