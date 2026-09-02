export function getAvatarUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&background=10b981&color=fff&size=128`;
}
