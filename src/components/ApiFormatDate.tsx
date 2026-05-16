// export function ApiFormatDate(dateInput: any): string {
//   try {
//     let date: Date | null = null;

    
//     if (dateInput instanceof Date) {
//       date = dateInput;
//     }

    
//     else if (
//       typeof dateInput === "string" &&
//       dateInput.toLowerCase().trim() === "new date()"
//     ) {
//       date = new Date();
//     }

    
//     else if (typeof dateInput === "number") {
//       date = new Date(dateInput);
//     }

//     // String format
//     else if (typeof dateInput === "string") {
//       const normalized = dateInput
//         .replace(/[.]/g, "-")
//         .replace(/[\/]/g, "-")
//         .replace(/--+/g, "-"); 

      
//       date = new Date(normalized);

     
//       if (isNaN(date.getTime())) {
//         const parts = normalized.split("-");
//         if (parts.length === 3) {
//           let [a, b, c] = parts.map(Number);

//           if (a > 31) {
//             date = new Date(a, b - 1, c); 
//           } else if (c > 31) {
//             date = new Date(c, b - 1, a); 
//           } else {
            
//             date = new Date(a + 2000, b - 1, c);
//           }
//         }
//       }
//     }

//     if (!date || isNaN(date.getTime())) {
//       console.warn("❌ Invalid date:", dateInput);
//       return "";
//     }

   
//     const year = date.getFullYear();
//     const month = String(date.getMonth() + 1).padStart(2, "0");
//     const day = String(date.getDate()).padStart(2, "0");

//     return `${year}-${month}-${day}`;
//   } catch (err) {
//     console.error("DateApiFormat error:", err);
//     return "";
//   }
// }
export function ApiFormatDate(dateInput: any): string {
  try {
    if (dateInput === undefined || dateInput === null) return "";

    let date: Date | null = null;

    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === "string") {
      if (dateInput.toLowerCase().trim() === "new date()") {
        date = new Date();
      } else {
        const normalized = dateInput
          .replace(/[.]/g, "-")
          .replace(/[\/]/g, "-")
          .replace(/--+/g, "-");

        date = new Date(normalized);
      }
    } else if (typeof dateInput === "number") {
      // Only allow valid timestamps (>= 1e9)
      if (dateInput > 1000000000) {
        date = new Date(dateInput);
      } else {
        console.warn("⚠️ Invalid numeric date input:", dateInput);
        return "";
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
