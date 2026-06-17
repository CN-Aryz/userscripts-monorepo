# userscripts-monorepo

一个用于开发 Tampermonkey 用户脚本的 monorepo。每个用户脚本一个包，共享工具集中在
`@repo/shared`，CI 负责增量打包、版本管理，并把构建产物（`dist`）提交回仓库供油猴自动更新。

```
.
├── packages/
│   └── shared/                 # @repo/shared —— 共享工具（tsup 构建为 ESM + d.ts）
├── userscripts/
│   └── github-stars/           # 一个用户脚本 = 一个包（vite + vite-plugin-monkey）
│       └── dist/               # 提交到仓库的产物：*.user.js + *.meta.js
├── .changeset/                 # changesets 版本策略
├── .github/workflows/
│   ├── ci.yml                  # PR：仅校验 affected 包
│   └── release.yml             # main：版本 PR + 构建 + 提交 dist
├── turbo.json                  # 任务编排 + 构建缓存
├── tsconfig.base.json          # 共享 TS 配置
└── pnpm-workspace.yaml
```

## 设计要点

### 1. 每个脚本一个包，工具共享
- `userscripts/*` 是可部署的脚本；`packages/*` 是库。
- `@repo/shared` 用 `tsup` 产出 ESM + `.d.ts`。脚本以 `workspace:*` 依赖它，Vite 打包时
  内联并 tree-shake。共享代码里的 `GM_*` 调用从 `vite-plugin-monkey/dist/client` 导入，
  tsup 用 `external` 保留为裸导入，由消费端的 vite-plugin-monkey 在打包时解析成真正的 GM 全局，
  并**自动收集对应的 `@grant`**（无需手动声明）。

### 2. TypeScript
- 根 `tsconfig.base.json`：`strict`、`Bundler` 解析、`noUncheckedIndexedAccess` 等。
- 每个包 `extends` 它。`vite-env.d.ts` 里 `/// <reference types="vite-plugin-monkey/client" />`
  提供 `GM_*` 与 `unsafeWindow` 等类型。

### 3. 增量打包 + 缓存
- `turbo.json` 的 `build` 任务声明 `inputs`（**仅源文件 + package.json**，不含 `dist`，
  避免提交产物造成输入自引用）与 `outputs: ["dist/**"]`。
- 无改动 → `FULL TURBO`（全缓存命中，毫秒级）。
- 改一个脚本 → 只有它 cache miss。改 `@repo/shared` → 它和所有依赖它的脚本都 cache miss
  （依赖图 + `dependsOn: ["^build"]` 级联）。
- `package.json` 在 `inputs` 内，所以 **版本号变化即触发该包重建**，新的 `@version` 进入产物。
- CI 用 `actions/cache` 缓存 `.turbo` 目录跨 run 复用（也可换 Turborepo Remote Cache）。

### 4. 版本与部署（产物提交回仓库）
更新策略：CI 打包完成后把 `dist` 提交到 git，油猴轮询 `@updateURL` 发现新 `@version` 后自动更新。

完整流程：
1. 改代码的 PR 里执行 `pnpm changeset` 记录变更，合并到 `main`。
2. `release.yml` 里 `changesets/action` 检测到待发布变更 → 自动开/更新一个
   **“Version Packages” PR**（`hasChangesets == true`，此时不构建）。
3. 合并该 PR → `main`。此时已无待发布变更（`hasChangesets == false`），工作流：
   - `pnpm turbo run build`（**不加 `--affected`**，靠缓存跳过未变包；版本号变了的包才真正重建）；
   - `git add userscripts/*/dist`，`git diff --staged --quiet` 判空后提交
     `chore: build userscripts [skip ci]` 并 push。
4. 油猴根据 `@updateURL`（指向轻量的 `*.meta.js`）发现新版本，从 `@downloadURL`
   （`*.user.js`）拉取更新。

### 5. 关键防回环 / 防坑
- dist 提交带 `[skip ci]`，不会触发新一轮工作流。
- `release.yml` 用 `concurrency: { group: release }` 串行化。
- `--affected` 需要**完整 git 历史**：CI checkout 必须 `fetch-depth: 0`，否则 turbo 把所有包
  当成已改。PR 校验用 `--affected` 并以 `TURBO_SCM_BASE/HEAD` 指定基准；release 构建在 `main`
  上跑，`--affected` 在主干自身无意义，因此改用全量 `build` + 缓存。
- 已知 turbo bug：根 `package.json` 变动会让 `--affected` 误判全部包受影响，必要时改用显式
  `--filter=...[origin/main]`。

## 常用命令

```bash
pnpm install
pnpm dev            # 启动某脚本的 vite dev server（油猴里安装 server 版热更新）
pnpm build          # 全量构建（缓存驱动）
pnpm build:affected # 仅构建变更包
pnpm typecheck
pnpm changeset      # 记录一次变更（选包 + 版本级别）
pnpm version        # 本地执行 changeset version（通常由 CI 完成）
```

## 新增一个脚本

复制 `userscripts/github-stars`，改 `package.json` 的 `name`/`version`，改 `vite.config.ts`
里的 `name`/`match`/`RAW_BASE`，重写 `src/main.ts`。turbo / changesets / CI 自动纳入，无需额外配置。

> 把所有 `YOUR_NAME` 替换成你的 GitHub 用户名/组织名。`raw.githubusercontent.com` 有约 5 分钟
> CDN 缓存，更新不是实时的；若需要更快可换自建静态托管或带 commit hash 的 URL 策略。
