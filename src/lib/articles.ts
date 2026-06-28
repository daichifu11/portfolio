// Zenn と Qiita の記事一覧をビルド時に取得し、公開日の新しい順にマージして返す。
// どちらも公開 API（認証不要）を fetch する。失敗してもビルドは止めず、空配列にフォールバックする。
import { ZENN_USERNAME, QIITA_USERNAME } from "@/config";

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

const COMMON_HEADERS = { "User-Agent": "portfolio-build" };

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
    return [];
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
    console.warn("[articles] Qiita フィードの取得に失敗しました:", e);
    return [];
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
