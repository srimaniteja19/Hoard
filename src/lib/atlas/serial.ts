export function atlasSerial(id: string): string {
  const hex = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `ATL-${hex.padEnd(4, "0")}`;
}
