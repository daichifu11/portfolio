// Zenn と Qiita の記事一覧をビルド時に取得し、公開日の新しい順にマージして返す。
// 取得に失敗したサービスは、コミット済みのキャッシュにフォールバックする。
import { ZENN_USERNAME, QIITA_USERNAME } from "@/config";
import articlesCache from "@/data/articles-cache.json";

export type ArticleSource = "zenn" | "qiita";

export interface Article {
  id: string;
  source: ArticleSource;
  title: string;
  /** Zenn の記事絵文字（アイコンに使う）。Qiita にはない。 */
  emoji?: string;
  /** Qiita のタグ名。Zenn の一覧 API では返らない。 */
  tags?: string[];
  /** 記事 URL（外部）。 */
  url: string;
  /** ISO 8601 形式の公開日時。 */
  publishedAt: string;
  /** いいね数。 */
  likedCount: number;
}

const COMMON_HEADERS = {
  Accept: "application/json",
  "User-Agent": "portfolio-build",
};

function getCachedArticles(source: ArticleSource): Article[] {
  return (articlesCache as Article[]).filter(
    (article) => article.source === source,
  );
}

// --- Zenn -------------------------------------------------------------------
interface ZennArticle {
  id: number;
  title: string;
  emoji: string;
  path: string;
  published_at: string;
  liked_count: number;
}

async function getZennArticles(): Promise<Article[]> {
  try {
    const res = await fetch(
      `https://zenn.dev/api/articles?username=${ZENN_USERNAME}&order=latest`,
      { headers: COMMON_HEADERS },
    );
    if (!res.ok) throw new Error(`Zenn API responded ${res.status}`);

    const data = (await res.json()) as { articles?: ZennArticle[] };
    return (data.articles ?? []).map((a) => ({
      id: `zenn-${a.id}`,
      source: "zenn" as const,
      title: a.title,
      emoji: a.emoji,
      url: `https://zenn.dev${a.path}`,
      publishedAt: a.published_at,
      likedCount: a.liked_count,
    }));
  } catch (e) {
    console.warn("[articles] Zenn フィードの取得に失敗しました:", e);
    const cached = getCachedArticles("zenn");
    console.warn(`[articles] Zenn キャッシュを使用します: ${cached.length}件`);
    return cached;
  }
}

// --- Qiita ------------------------------------------------------------------
interface QiitaItem {
  id: string;
  title: string;
  url: string;
  created_at: string;
  likes_count: number;
  tags: { name: string }[];
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function getText(block: string, tag: string) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

async function getQiitaFeedArticles(): Promise<Article[]> {
  const res = await fetch(`https://qiita.com/${QIITA_USERNAME}/feed.atom`, {
    headers: COMMON_HEADERS,
  });
  if (!res.ok) throw new Error(`Qiita feed responded ${res.status}`);

  const xml = await res.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.map((entry) => {
    const url =
      entry.match(/<link[^>]+rel="alternate"[^>]+href="([^"]+)"/)?.[1] ??
      getText(entry, "url");
    const id = url.split("/").filter(Boolean).at(-1) ?? getText(entry, "id");

    return {
      id: `qiita-${id}`,
      source: "qiita" as const,
      title: getText(entry, "title"),
      tags: [],
      url,
      publishedAt: getText(entry, "published") || getText(entry, "updated"),
      likedCount: 0,
    };
  });
}

async function getQiitaArticles(): Promise<Article[]> {
  try {
    const res = await fetch(
      `https://qiita.com/api/v2/users/${QIITA_USERNAME}/items?per_page=20`,
      { headers: COMMON_HEADERS },
    );
    if (!res.ok) throw new Error(`Qiita API responded ${res.status}`);

    const items = (await res.json()) as QiitaItem[];
    return (items ?? []).map((it) => ({
      id: `qiita-${it.id}`,
      source: "qiita" as const,
      title: it.title,
      tags: (it.tags ?? []).map((t) => t.name),
      url: it.url,
      publishedAt: it.created_at,
      likedCount: it.likes_count,
    }));
  } catch (e) {
    console.warn("[articles] Qiita API の取得に失敗しました:", e);
    try {
      return await getQiitaFeedArticles();
    } catch (feedError) {
      console.warn("[articles] Qiita feed の取得に失敗しました:", feedError);
    }
    const cached = getCachedArticles("qiita");
    console.warn(`[articles] Qiita キャッシュを使用します: ${cached.length}件`);
    return cached;
  }
}

// --- 統合 -------------------------------------------------------------------
export async function getArticles(): Promise<Article[]> {
  const [zenn, qiita] = await Promise.all([
    getZennArticles(),
    getQiitaArticles(),
  ]);
  return [...zenn, ...qiita].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}
