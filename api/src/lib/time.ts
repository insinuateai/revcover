export const fmtUtc = (d: Date | string | number) =>
  new Date(d).toISOString().replace("T", " ").replace("Z", " UTC");
export const CSV_TZ_HEADER = "All times UTC";
