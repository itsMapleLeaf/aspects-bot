export function jsonStringifySafe(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
