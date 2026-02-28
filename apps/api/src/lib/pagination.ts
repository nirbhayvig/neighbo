export function encodeCursor(lastDocId: string): string {
  return Buffer.from(JSON.stringify({ lastDocId })).toString("base64url")
}

export function decodeCursor(cursor: string): string | null {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    return typeof decoded.lastDocId === "string" ? decoded.lastDocId : null
  } catch {
    return null
  }
}
