import useDropboxUpload from "@/src/hooks/useDropboxUpload";
import React from "react";
import { useTranslation } from "react-i18next";

export default function DropboxUploadRunner() {
  const { t } = useTranslation();
  useDropboxUpload(t);
  return null;
}
