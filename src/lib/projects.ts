// プロジェクト一覧の共有データ。一覧（ProjectList）と詳細ページ（works/[slug]）で使う。
export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  /** 詳細ページの URL に使う識別子（/works/<slug>）。半角英数とハイフン推奨。 */
  slug: string;
  title: string;
  /** 一覧に出す短い説明（1〜2文）。 */
  summary: string;
  year: string;
  isNew?: boolean;
  /** 一覧のサムネ画像。public 配下のパス（例: "/works/foo/thumb.webp"）。未指定なら番号プレースホルダー。 */
  thumbnail?: string;
  /** 詳細ページの本文。段落ごとに配列で。任意。 */
  description?: string[];
  /** About の上に表示するカバー画像。public 配下のパス。任意。 */
  cover?: string;
  /** 詳細ページのギャラリー画像。public 配下のパスの配列。すべてギャラリーに表示される。任意。 */
  images?: string[];
  /** 外部リンク（GitHub / 公開サイト など）。任意。 */
  links?: ProjectLink[];
}

export const projects: Project[] = [
  {
    slug: "wetime",
    title: "WeTime",
    summary: "予定共有アプリ",
    year: "2025",
    isNew: false,
    thumbnail: "/works/wetime/thumbnails.png",
    images: ["/works/wetime/1.png", "/works/wetime/2.png", "/works/wetime/3.png", "/works/wetime/4.png"],
    description: [],
    cover: "",
    links: [{ label: "Site", href: "https://weeetime.com" }],
  },
  {
    slug: "mint",
    title: "Mint",
    summary: "自分のことをフォロワーに聞けるWebサービス(サービス終了済)",
    year: "2021",
    thumbnail: "/works/mint/thumbnails.png",
    images: ["/works/mint/1.png", "/works/mint/2.png"],
    description: [],
    cover: "",
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
