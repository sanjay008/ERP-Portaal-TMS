export const formatDate = (dateString: string, lang: string = "en") => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    // ✅ Fix: Ensure valid locale always
    const safeLang = lang && lang.trim() !== "" ? lang : "en-US";

    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString(safeLang, { month: "short" });
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  } catch (err) {
    console.log("Date format error:", err);

    return dateString;
  }
};
