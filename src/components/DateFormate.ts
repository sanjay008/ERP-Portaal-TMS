export const formatDate = (dateString: string, lang: string = "en") => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString(lang, { month: "short" });
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (err) {
    console.error("Date format error:", err);
    return dateString;
  }
};
