import { Images } from "@/src/assets/images";
import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { styles } from "./styles";
import {
  buildTypeSubtitle,
  resolveDocumentFileType,
  type QuickUploadType,
  type RelatieDocument,
} from "./types";
import {
  extractDocumentApiError,
  fetchDocumentDetails,
  fetchQuickUploadTypes,
  fetchRelatieDocuments,
  isApiSuccess,
  parseDocumentDetails,
  parseQuickUploadTypes,
  parseRelatieDocuments,
} from "./uploadDocumentsApi";

export default function UploadDocumentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { UserData, setToast } = useContext(GlobalContextData);
  const { ErrorHandle } = useErrorHandle();

  const [types, setTypes] = useState<QuickUploadType[]>([]);
  const [documents, setDocuments] = useState<RelatieDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [openingDoc, setOpeningDoc] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<RelatieDocument | null>(null);

  const userDataRef = useRef(UserData);
  const setToastRef = useRef(setToast);
  const errorHandleRef = useRef(ErrorHandle);
  const tRef = useRef(t);
  const inFlightRef = useRef(false);
  const openingRef = useRef(false);

  userDataRef.current = UserData;
  setToastRef.current = setToast;
  errorHandleRef.current = ErrorHandle;
  tRef.current = t;

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setErrorText("");
    try {
      const [typesRes, docsRes] = await Promise.all([
        fetchQuickUploadTypes(userDataRef.current, true),
        fetchRelatieDocuments(userDataRef.current),
      ]);

      if (isApiSuccess(typesRes)) {
        setTypes(parseQuickUploadTypes(typesRes));
      } else {
        const msg =
          extractDocumentApiError(typesRes) ||
          typesRes?.message ||
          tRef.current("Something went wrong. Please try again.");
        setErrorText(msg);
        setToastRef.current({
          visible: true,
          text: msg,
          type: "error",
          top: 45,
        });
      }

      if (isApiSuccess(docsRes)) {
        setDocuments(parseRelatieDocuments(docsRes));
      }
    } catch (error: any) {
      const apiMsg = extractDocumentApiError(error?.response?.data);
      const handled = errorHandleRef.current(error);
      const message =
        apiMsg ||
        handled?.message ||
        tRef.current("Something went wrong. Please try again.");
      setErrorText(message);
      setToastRef.current({
        visible: true,
        text: message,
        type: "error",
        top: 45,
      });
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openDocument = useCallback(
    async (doc: RelatieDocument) => {
      if (openingRef.current || doc?.id == null) return;
      openingRef.current = true;
      setOpeningDoc(true);
      try {
        const res = await fetchDocumentDetails(userDataRef.current, doc.id);
        if (!isApiSuccess(res)) {
          const msg =
            extractDocumentApiError(res) ||
            res?.message ||
            tRef.current("Something went wrong. Please try again.");
          setToastRef.current({
            visible: true,
            text: msg,
            type: "error",
            top: 45,
          });
          return;
        }

        const details = parseDocumentDetails(res) || doc;
        const viewUrl = details.view_url || details.shared_link || "";
        if (!viewUrl) {
          setToastRef.current({
            visible: true,
            text: tRef.current("Document not found."),
            type: "error",
            top: 45,
          });
          return;
        }

        const fileType = resolveDocumentFileType(details);
        if (fileType === "image") {
          setPreviewDoc(details);
          setPreviewVisible(true);
          return;
        }

        navigation.navigate("WebViewScreeens", {
          title: details.filename || details.type || tRef.current("Document"),
          url: viewUrl,
        });
      } catch (error: any) {
        const apiMsg = extractDocumentApiError(error?.response?.data);
        const handled = errorHandleRef.current(error);
        setToastRef.current({
          visible: true,
          text:
            apiMsg ||
            handled?.message ||
            tRef.current("Something went wrong. Please try again."),
          type: "error",
          top: 45,
        });
      } finally {
        openingRef.current = false;
        setOpeningDoc(false);
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <DetailsHeader title={t("Upload Documents")} />
      <View style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>{t("Upload your documents")}</Text>
            <Text style={styles.introText}>
              {t(
                "Select a document type and upload clear photos. Driving licence requires front, back and expiry date.",
              )}
            </Text>
          </View>

          {errorText && !types.length ? (
            <View style={styles.sectionCard}>
              <Text style={styles.emptyText}>{errorText}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryBtnText}>{t("Retry")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {types.map((item) => (
            <TouchableOpacity
              key={item.slug || item.type}
              style={styles.typeCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("DocumentUpload", {
                  documentType: item,
                })
              }
            >
              <View style={styles.typeCardLeft}>
                <View style={styles.typeIconBox}>
                  <Image
                    source={Images.documentlogo}
                    style={styles.typeIcon}
                  />
                </View>
                <View style={styles.typeTexts}>
                  <Text style={styles.typeTitle}>{t(item.type)}</Text>
                  <Text style={styles.typeSubtitle}>
                    {t(buildTypeSubtitle(item))}
                  </Text>
                </View>
              </View>
              <Image source={Images.RightIcon} style={styles.rightIcon} />
            </TouchableOpacity>
          ))}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("Uploaded Documents")}</Text>
            {documents.length === 0 ? (
              <Text style={styles.emptyText}>
                {t("No documents uploaded yet.")}
              </Text>
            ) : (
              documents.map((doc) => (
                <TouchableOpacity
                  key={String(doc.id)}
                  style={styles.docCard}
                  activeOpacity={0.85}
                  onPress={() => openDocument(doc)}
                >
                  <View style={styles.docCardRow}>
                    <View style={styles.docCardTexts}>
                      <Text style={styles.docTitle}>
                        {doc.filename || doc.type || t("Document")}
                      </Text>
                      {doc.type ? (
                        <Text style={styles.docMeta}>{t(doc.type)}</Text>
                      ) : null}
                      {doc.expire_date ? (
                        <Text style={styles.docMeta}>
                          {`${t("Expiry Date")}: ${doc.expire_date}`}
                        </Text>
                      ) : null}
                      {doc.status_name ? (
                        <Text style={styles.docMeta}>{doc.status_name}</Text>
                      ) : null}
                    </View>
                    <Image source={Images.RightIcon} style={styles.rightIcon} />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <LoadingModal
        visible={loading || openingDoc}
        message={t("Please wait…")}
      />
      <DocumentPreviewModal
        visible={previewVisible}
        title={previewDoc?.filename || previewDoc?.type || t("Document")}
        imageUri={previewDoc?.view_url || previewDoc?.shared_link}
        downloadUrl={previewDoc?.download_url}
        onClose={() => {
          setPreviewVisible(false);
          setPreviewDoc(null);
        }}
      />
    </SafeAreaView>
  );
}
