# 项目 Review 文档

日期：2026-05-13  
范围：Astro 启动加载问题、代码编写质量、逻辑、冗余、性能、未使用项。

## 结论

已处理浏览器启动后长期 loading 的主要页面资源风险：全局 CSS 原本通过 `@import` 拉取 Google Fonts，并通过远程 `@font-face` 拉取 `fonts.cdnfonts.com` 的 Dirtyline 字体；其中 cdnfonts 字体 URL 实测返回 404，外部字体域名在本地 Chrome 中还会触发 HTTPS 连接失败日志。现在项目保留原来的字体观感，但字体文件改为 `/public/fonts` 本地自托管，页面运行时不再请求外部字体域名。

同时修复了音乐接口的外部请求无超时风险，以及搜索接口 `limit=abc` 会产生 `NaN` 的输入校验问题。

## 已修复项

1. 启动后浏览器 loading 风险

- 原因：`src/styles/global.css` 顶部存在外部字体 `@import` 和远程 `@font-face`，其中 `https://fonts.cdnfonts.com/s/15011/Dirtyline36DaysofType.woff` 返回 404；这类外部 CSS/font 请求会拖住页面加载状态，尤其在网络不稳定或跨境访问时更明显。
- 修复：
  - 移除 `src/styles/global.css` 中的远程字体加载。
  - 移除 `src/layouts/BaseLayout.astro` 中对 Google Fonts 的 `preconnect`。
  - 将原先主要字体 `Press Start 2P`、`Silkscreen`、`VT323`、`Barlow`、`Inter`、`Instrument Serif` 下载到 `public/fonts`，并通过本地 `@font-face` 引用。
  - 将全局 CSS、Tailwind 字体配置、组件内字体族恢复为原字体栈，但来源为本地文件。
- 相关文件：
  - `src/styles/global.css`
  - `src/layouts/BaseLayout.astro`
  - `tailwind.config.mjs`
  - `src/components/MusicPlayer.astro`
  - `src/components/WanderHero.tsx`
  - `src/components/ParticleCanvas.astro`
  - `public/fonts/*`

2. 外部音乐 API 无超时

- 原因：`fetch()` 请求网易云搜索、播放地址和上游音频响应头时没有超时控制。上游网络卡住时，接口可能长时间不返回。
- 修复：
  - `src/lib/netease.ts` 增加 `NETEASE_REQUEST_TIMEOUT_MS = 8000` 和统一 `AbortSignal.timeout()`。
  - 搜索和播放地址请求使用超时信号。
  - `src/pages/api/music/stream.ts` 只限制“拿到上游响应头”的时间，响应体开始流式返回后清理定时器，避免长音频被 8 秒超时截断。

3. 搜索接口 limit 校验

- 原因：`Number(url.searchParams.get('limit') || 10)` 在 `limit=abc` 时得到 `NaN`，随后会传给上游 API。
- 修复：新增 `parseLimit()`，非数字默认 10，并限制范围为 1 到 20。
- 相关文件：`src/pages/api/music/search.ts`

## 验证结果

- `npm run build`：通过。
- 重启 dev server 后访问首页：`GET /` 返回 `200 OK`，HTML 大小约 174 KB。
- Headless Chrome `--dump-dom http://127.0.0.1:4321/`：能输出完整 DOM。
- 检查首页 HTML/DOM：没有 `fonts.googleapis.com`、`fonts.gstatic.com`、`cdnfonts`、`@import`；`@font-face` 只引用本地 `/fonts/...` 文件。
- API 验证：
  - `/api/music/search?q=a&limit=abc` 返回 `400`，原因是查询长度不足，未再因非法 `limit` 产生异常。
  - `/api/music/stream?id=abc` 返回 `400 Invalid song id`。

说明：Headless Chrome 仍会输出少量 `clientservices.googleapis.com` / safe browsing 相关 SSL 日志，这是 Chrome 自身后台服务，不是页面资源请求。

## 仍建议处理的问题

### 高优先级

1. `MusicPlayer.astro` 事件监听缺少完整清理

- 位置：`src/components/MusicPlayer.astro`
- 问题：组件设置了大量 DOM/window/document/audio 事件监听和 resize 定时器，但没有像 `ParticleCanvas.astro` 一样监听 `astro:before-swap` 进行完整 cleanup。项目启用了 `ViewTransitions` 和 `transition:persist`，当前节点持久化能缓解重复挂载，但维护成本较高；一旦后续改动移除 persist 或让组件重新挂载，容易出现重复监听、重复播放状态广播、内存泄漏。
- 建议：抽出 `cleanup()`，统一移除 listener、取消 raf/timer，并在 `astro:before-swap` 或组件生命周期中调用。

2. 音乐播放器单文件过大

- 位置：`src/components/MusicPlayer.astro`
- 问题：一个文件同时包含数据、模板、CSS、播放器状态机、拖拽、在线搜索、音频可视化桥接逻辑，已经超过 1200 行。后续改播放器时很容易误伤拖拽或 API 逻辑。
- 建议：拆成至少三层：静态 Astro markup、播放器 client script、样式或小型 utility。先拆纯 JS helpers，不急着引入新状态管理库。

### 中优先级

3. 首页视觉与 Canvas 动效性能压力偏高

- 位置：`src/components/WanderHero.tsx`、`src/components/ParticleCanvas.astro`
- 问题：首页同时有 React island、mp4 背景、GSAP 鼠标跟随、全屏 canvas requestAnimationFrame、全局扫描线/渐变。低端设备或移动端可能掉帧。
- 已有优点：`ParticleCanvas` 在 `visibilitychange` 时暂停动画，且支持 reduced motion。
- 建议：移动端降低粒子数量，视频加 `poster`，并对 GSAP 鼠标跟随按 `prefers-reduced-motion` 跳过。

4. 在线搜索结果会持续追加到 `tracks`

- 位置：`src/components/MusicPlayer.astro`
- 问题：每次搜索会 `onlineResults.innerHTML = ''` 清空 DOM，但旧在线歌曲仍留在 `tracks` 数组里。多次搜索后 `tracks` 会持续增长，并影响 shuffle 队列。
- 建议：区分 `localTracks` 和 `onlineTracks`，每次搜索替换在线列表，而不是无限 push 到同一数组。

5. 图片资源偏大

- 位置：`public/art/tranici-logo.png`、`public/og-cover.png`、`public/art/banner.png`
- 问题：logo 约 1.4 MB，OG 图约 1.7 MB，banner png 约 1.8 MB。logo 作为 header 首屏资源尤其不划算。
- 建议：logo 导出为更小尺寸的 PNG/WebP/SVG；OG 图保留 1200x630 但压缩；未用于首屏的图片延迟加载或移除。

### 低优先级

6. 内容数据硬编码在组件内

- 位置：`src/components/PostList.astro`、`src/components/AboutPanel.astro`、`src/components/MusicPlayer.astro`
- 问题：posts、skills、tracks 都直接写在组件里。当前项目小可以接受，但后续扩展内容会让组件变成数据仓库。
- 建议：先迁移到 `src/data/*.ts`，不必上 CMS。

7. 部分链接仍是占位

- 位置：`src/components/AboutPanel.astro`、`src/components/WebRing.astro`
- 问题：`href="#"` 会造成无意义导航。
- 建议：真实链接未准备好时改成 button disabled 或隐藏，避免可访问性和 SEO 噪音。

## 未使用或疑似未使用项

1. `src/components/Hero.astro`

- 未被任何页面 import。当前首页使用的是 `WanderHero.tsx`。
- 建议：如果旧版首页不再需要，删除；如果要保留，移动到 `src/components/legacy/` 并注明用途。

2. `public/art/hero-crt.png`、`public/art/banner.png`

- 当前代码未引用。
- 建议：确认是否是旧稿素材。无使用计划则删除，减少仓库体积。

3. `.next/`

- 项目是 Astro，不是 Next.js；根目录存在 `.next/` 遗留目录。
- `.gitignore` 已覆盖构建目录，但 `.next/` 没有列出。
- 建议：删除本地 `.next/` 并把 `.next/` 加入 `.gitignore`。

4. `CLAUDE.md`

- 文件为空。
- 建议：若不用 Claude 项目说明，删除；若保留，写明项目启动、构建、检查命令。

5. `.claude/`

- 属于本地工具配置，不应进入项目版本控制。
- 建议：如果未来初始化 git，加入 `.gitignore`。

## 工程化建议

1. 增加基础检查脚本

- 当前 `package.json` 只有 dev/build/preview，没有 lint、format、typecheck 脚本。
- 建议增加：
  - `check`: `astro check`
  - `lint`: ESLint 或 Biome
  - `format`: Prettier 或 Biome

2. 加最小回归测试

- 首页能返回 200。
- `/api/music/search` 对非法 query/limit 返回稳定错误。
- `/api/music/stream` 对非法 id 返回 400。

3. 明确是否需要 `output: 'server'`

- 当前项目只有音乐 API 需要 SSR/server endpoint。如果后续部署平台支持静态站点 + serverless API，可以考虑按部署目标拆分，减少运行时复杂度。

## 当前状态

启动 loading 问题已按资源加载根因修复，构建通过，本地 dev server 可访问：

`http://127.0.0.1:4321/`
