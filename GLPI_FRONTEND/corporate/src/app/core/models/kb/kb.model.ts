export interface KbCategory {
  id: string;
  name: string;
  icon: string;
  articleCount?: number;
}

export interface KbArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  categoryName: string;
  authorName: string;
  views: number;
  publishedAt: string;
  tags: string[];
}
