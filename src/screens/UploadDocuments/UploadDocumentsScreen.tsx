import DetailsHeader from "@/src/components/DetailsHeader";
import { useErrorHandle } from "@/src/components/ErrorHandle";
import LoadingModal from "@/src/components/LoadingModal";
import { GlobalContextData } from "@/src/context/GlobalContext";
import { Colors } from "@/src/utils/colors";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useContext, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { styles } from "./styles";
import {
  resolveDocumentFileType,
  type QuickUploadType,
  type RelatieDocument,
} from "./types";

function typeIconName(item: QuickUploadType): keyof typeof Ionicons.glyphMap {
  const key = `${item.slug || ""} ${item.type || ""}`.toLowerCase();
  if (key.includes("licen") || key.includes("rijbewijs")) return "card-outline";
  if (key.includes("passport") || key.includes("paspoort")) return "book-outline";
  if (key.includes("niwo")) return "briefcase-outline";
  if (key.includes("insurance") || key.includes("verzek")) return "shield-checkmark-outline";
  if (key.includes("id") || key.includes("ident")) return "person-outline";
  return "document-text-outline";
}

function fileIconName(doc: RelatieDocument): keyof typeof Ionicons.glyphMap {
  const kind = resolveDocumentFileType(doc);
  if (kind === "image") return "image-outline";
  if (kind === "pdf") return "document-outline";
  return "folder-outline";
}
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
  const typesRef = useRef(types);

  userDataRef.current = UserData;
  setToastRef.current = setToast;
  errorHandleRef.current = ErrorHandle;
  tRef.current = t;
  typesRef.current = types;

  const load = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    // Only block UI when we have nothing to show yet.
    const showBlockingLoader = typesRef.current.length === 0;
    if (showBlockingLoader) {
      setLoading(true);
    }
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
          {errorText && !types.length ? (
            <View style={styles.sectionCard}>
              <Text style={styles.emptyText}>{errorText}</Text>
              <Pressable style={styles.retryBtn} onPress={load}>
                <Text style={styles.retryBtnText}>{t("Retry")}</Text>
              </Pressable>
            </View>
          ) : null}

          {types.length > 0 ? (
            <View style={styles.listBlock}>
              {types.map((item, index) => (
                <Animated.View
                  key={item.slug || item.type}
                  entering={FadeInDown.duration(280).delay(index * 40)}
                >
                  <Pressable
                    style={({ pressed }) => [
                      styles.typeCard,
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() =>
                      navigation.navigate("DocumentUpload", {
                        documentType: item,
                      })
                    }
                  >
                    <View style={styles.typeIconBox}>
                      <Ionicons
                        name={typeIconName(item)}
                        size={22}
                        color={Colors.primary}
                      />
                    </View>
                    <Text style={styles.typeTitle} numberOfLines={2}>
                      {t(item.type)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={Colors.primary}
                    />
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ) : null}

          <View style={styles.docsHeader}>
            <Text style={styles.sectionTitle}>{t("Uploaded Documents")}</Text>
            {documents.length > 0 ? (
              <Text style={styles.sectionMeta}>{documents.length}</Text>
            ) : null}
          </View>

          {documents.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="cloud-upload-outline"
                size={28}
                color={Colors.primary}
              />
              <Text style={styles.emptyText}>
                {t("No documents uploaded yet.")}
              </Text>
            </View>
          ) : (
            documents.map((doc, index) => (
              <Animated.View
                key={String(doc.id)}
                entering={FadeInDown.duration(280).delay(index * 35)}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.docCard,
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => openDocument(doc)}
                >
                  <View style={styles.docIconBox}>
                    <Ionicons
                      name={fileIconName(doc)}
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={styles.docCardTexts}>
                    <Text style={styles.docTitle} numberOfLines={1}>
                      {doc.filename || doc.type || t("Document")}
                    </Text>
                    <View style={styles.docMetaRow}>
                      {doc.type ? (
                        <Text style={styles.docMeta} numberOfLines={1}>
                          {t(doc.type)}
                        </Text>
                      ) : null}
                      {doc.expire_date ? (
                        <Text style={styles.docMeta} numberOfLines={1}>
                          {doc.expire_date}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {doc.status_name ? (
                    <View style={styles.statusPill}>
                      <Text style={styles.statusPillText} numberOfLines={1}>
                        {doc.status_name}
                      </Text>
                    </View>
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={Colors.darkText}
                    />
                  )}
                </Pressable>
              </Animated.View>
            ))
          )}
        </ScrollView>
      </View>

      <LoadingModal
        visible={(loading && types.length === 0) || openingDoc}
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
