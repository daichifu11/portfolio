// base パス（/portfolio）を考慮した内部リンク/アセットのURLを作るヘルパー。
// 例: url('/works') -> '/portfolio/works'
const BASE = import.meta.env.BASE_URL;

export function url(path = "/") {
  const base = BASE.endsWith("/") ? BASE.slice(0, -1) : BASE;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
