export function ApiFormatDate(dateInput: any): string {
  try {
    let date: Date | null = null;

    if (dateInput instanceof Date) {
      date = dateInput;
    }
    else if (
      typeof dateInput === "string" &&
      dateInput.toLowerCase().trim() === "new date()"
    ) {
      date = new Date();
    }
    else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    }
    else if (typeof dateInput === "string") {
      let normalized = dateInput
        .replace(/[.]/g, "-")
        .replace(/[\/]/g, "-")


      date = new Date(normalized);

      if (isNaN(date.getTime())) {
        const parts = normalized.split("-");
        if (parts.length === 3) {
          let [p1, p2, p3] = parts.map(p => parseInt(p));
          if (p1 > 31) {
            date = new Date(p1, p2 - 1, p3);
          } else if (p3 > 31) {
            date = new Date(p3, p2 - 1, p1);
          }
        }
      }
    }

    if (!date || isNaN(date.getTime())) {
      console.warn("❌ Invalid date:", dateInput);
      return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error("DateApiFormat error:", err);
    return "";
  }
}
