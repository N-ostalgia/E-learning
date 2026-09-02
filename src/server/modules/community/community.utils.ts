// src/server/modules/community/community.utils.ts
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    + "-" + Math.random().toString(36).substring(2, 8);
}

export function getAvatarUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&background=10b981&color=fff&size=128`;
}
