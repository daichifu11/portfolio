import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const configPath = path.join(root, "src/config.ts");
const cachePath = path.join(root, "src/data/articles-cache.json");

const COMMON_HEADERS = {
  Accept: "application/json",
  "User-Agent": "portfolio-build",
};

function readConst(source, name) {
  const match = source.match(new RegExp(`export const ${name} = "([^"]+)"`));
  if (!match) throw new Error(`${name} is missing in src/config.ts`);
  return match[1];
}

async function readExistingCache() {
  try {
    return JSON.parse(await readFile(cachePath, "utf8"));
  } catch {
    return [];
  }
}

function sortArticles(articles) {
  return articles.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

async function getZennArticles(username) {
  const res = await fetch(
    `https://zenn.dev/api/articles?username=${username}&order=latest`,
    { headers: COMMON_HEADERS },
  );
  if (!res.ok) throw new Error(`Zenn API responded ${res.status}`);

  const data = await res.json();
  return (data.articles ?? []).map((article) => ({
    id: `zenn-${article.id}`,
    source: "zenn",
    title: article.title,
    emoji: article.emoji,
    url: `https://zenn.dev${article.path}`,
    publishedAt: article.published_at,
    likedCount: article.liked_count,
  }));
}

async function getQiitaArticles(username) {
  try {
    const res = await fetch(
      `https://qiita.com/api/v2/users/${username}/items?per_page=20`,
      { headers: COMMON_HEADERS },
    );
    if (!res.ok) throw new Error(`Qiita API responded ${res.status}`);

    const items = await res.json();
    return (items ?? []).map((item) => ({
      id: `qiita-${item.id}`,
      source: "qiita",
      title: item.title,
      tags: (item.tags ?? []).map((tag) => tag.name),
      url: item.url,
      publishedAt: item.created_at,
      likedCount: item.likes_count,
    }));
  } catch (error) {
    console.warn("[articles] qiita: API failed, trying Atom feed", error);
    return getQiitaFeedArticles(username);
  }
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function getText(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1].trim()) : "";
}

async function getQiitaFeedArticles(username) {
  const res = await fetch(`https://qiita.com/${username}/feed.atom`, {
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
      source: "qiita",
      title: getText(entry, "title"),
      tags: [],
      url,
      publishedAt: getText(entry, "published") || getText(entry, "updated"),
      likedCount: 0,
    };
  });
}

async function getArticles(source, fetcher, existingCache) {
  try {
    const articles = await fetcher();
    console.log(`[articles] ${source}: fetched ${articles.length} article(s)`);
    return articles;
  } catch (error) {
    const cached = existingCache.filter((article) => article.source === source);
    console.warn(
      `[articles] ${source}: fetch failed, keeping ${cached.length} cached article(s)`,
      error,
    );
    return cached;
  }
}

const config = await readFile(configPath, "utf8");
const zennUsername = readConst(config, "ZENN_USERNAME");
const qiitaUsername = readConst(config, "QIITA_USERNAME");
const existingCache = await readExistingCache();

const [zenn, qiita] = await Promise.all([
  getArticles("zenn", () => getZennArticles(zennUsername), existingCache),
  getArticles("qiita", () => getQiitaArticles(qiitaUsername), existingCache),
]);

const articles = sortArticles([...zenn, ...qiita]);
if (articles.length === 0) {
  throw new Error("No articles were fetched or cached.");
}

await mkdir(path.dirname(cachePath), { recursive: true });
await writeFile(cachePath, `${JSON.stringify(articles, null, 2)}\n`);
console.log(`[articles] cache updated: ${cachePath}`);
