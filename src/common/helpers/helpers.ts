export class HelperUtils {
  /**
   * Parse a date string in d/m/yyyy format into a JS Date object
   * Example: "12/02/2024" → 12 Feb 2024
   */
  static parseDate(dateStr: string, isEnd = false): Date | null {
    if (!dateStr) return null;

    const [day, month, year] = dateStr.split(/[\/.-]/).map(Number);
    if (!day || !month || !year) return null;

    if (isEnd) {
      return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    } else {
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
  }
}
