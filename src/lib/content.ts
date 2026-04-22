export function splitPostContent(content: string): string[] {
  let parts = content.split("\\n");
  if (parts.length === 1) {
    parts = content.split("\r");
    if (parts.length === 1) parts = content.split("\n");
  }
  return parts;
}
