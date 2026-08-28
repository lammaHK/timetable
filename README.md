# TimeTable 時間表

一個免費、公開、可加到 iPhone 主畫面當網頁 App 使用的**共享時間表**。

- 進入即是最新月份的月曆，點任意一天查看／編輯該日事件
- 每個事件有三級可見度：`公開`（任何人都能看到，包括訪客）、`成員`（所有登入者）、`僅自己`
- 登入後 session 長期保存，不用每次登入
- 淺色／深色日夜模式（可跟隨系統）、雙語 中文／English
- 動畫 smooth（framer-motion）

## 免費架構

| 部分 | 方案 | 費用 |
|------|------|------|
| 前端 (React + Vite) | GitHub Pages | 免費 |
| 資料庫 + Auth | Supabase Free Tier | 免費 |
| 登入 | Google OAuth + Email magic link | 免費 |
| 圖示 / 素材 | 自製 SVG/PNG | 免費 |

## 本地開發

```bash
npm install
cp .env.example .env    # 填入你的 Supabase URL + anon key
npm run dev
```

## 部署

push 到 `main` 即自動經 GitHub Actions 部署到 GitHub Pages。
需要的 Secret（在 repo → Settings → Secrets and variables → Actions）：
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 資料庫設定

建表與權限（Row Level Security）在 `supabase/migrations/00001_init.sql`，
用 Supabase CLI：`supabase db push`（需先 `supabase login`）。

設定的方式：
1. Supabase Dashboard → 建專案
2. **Auth → Providers**：開啟 Google、Email；Email 可開「Magic link」
3. **Auth → URL Configuration**：把 Site URL 設成你的 GitHub Pages 網址
4. 填 `.env` 及 GitHub Secrets
