# CLAUDE.md · 前端（CICD-DEMO-WEB）

Vue 3 + Vite，JavaScript（见 `jsconfig.json`），PC 端。路径别名 `@` 指向 `src/`。

## 事实源在哪里

需求、接口清单、原型在 **CICD-DEMO-CONTEXT** 仓库（`https://github.com/xiayingspace-hue/CICD-DEMO-CONTEXT`，本地 `../CICD-DEMO-CONTEXT`，读 `main` 分支）。

| 要回答的问题 | 读哪里 |
|---|---|
| 做什么、校验规则、提示文案、什么情况算对 | `requirements/**` 需求文档（唯一事实源，看 AC） |
| 页面长什么样、怎么点、各状态显示什么 | `prototypes/*.html`（红点标注回指 AC） |
| 接口路径、字段、枚举、错误码 | `outputs/api/API-*.md`（草案，以后端实现为准） |
| 怎么验收 | `outputs/qa/QA-*.md` |

**原型不是生产代码**：照着它实现交互和状态，不复用它的 HTML、CSS 类名和脚本。提示文案以需求文档为准，不自行改写。

## 视觉

- 颜色、字体、圆角、阴影只用 CONTEXT 仓库 `prototypes/_shared/tokens.css` 里的品牌 token。把它复制为 `src/assets/tokens.css` 并在入口引入，**不自己定色值**。
- token 更新时整份覆盖，不手工编辑取值。
- 组件样式写在各自的 `.vue` 文件里，引用 `var(--brand-xxx)`。

## 目录约定

```
src/
  api/           # 请求封装与各接口，按业务域分文件（auth.js …）
  router/        # 路由
  views/         # 页面，按业务域分目录（auth/LoginView.vue …）
  components/    # 通用组件（现有示例组件保留，不要删）
  assets/
```

- 登录相关：`views/auth/LoginView.vue`、`api/auth.js`。
- 需要路由时可以新增 `vue-router`；其他依赖先在 PR 描述里说明理由，不随意新增。
- 接口地址通过 `/defect-service/...` 访问网关。开发时在 `vite.config.js` 配代理，把 `/defect-service` 转到 `http://localhost:8080`。**接口基础地址不写死在代码里。**
- 字段名、枚举值、错误码与接口清单一致，不自行重命名。

## 给 E2E 测试留稳定的定位方式

QA 仓库的 Playwright 会读本仓代码来定位元素。关键交互元素必须有稳定的定位方式：

- 表单控件用 `<label for>` 关联。
- 提示条、按钮等需要被断言的元素加 `data-testid`，命名取自原型里的元素 id，例如 `banner-cred`、`btn-login`、`toggle-pwd`、`e-account`、`e-password`。
- 改样式、改文案不应导致定位失效。

## 构建与检查

```
npm install
npm run dev
npm run build        # 提交前必须通过
```

目前没有单元测试框架。需要新增时先在 PR 里说明。

## 遇到疑问怎么办

不要自行发明。按顺序：

1. 先查需求、接口清单、原型标注、需求第 11 章「已知缺口」。能推出来的不问。
2. 缺口表里有「默认处理」的，按默认做，并在 PR 描述里写明「按默认处理，见需求第 N 章」。
3. 都没有，在 **CICD-DEMO-CONTEXT 仓库开 Issue**（`gh issue create -R xiayingspace-hue/CICD-DEMO-CONTEXT`），标签 `question`、`ai-raised`、对应的 `REQ-xxx`。内容包含：引用的文档位置、疑问、2-3 个选项、你建议的默认选项。开之前先搜已有未关闭的 Issue，已有就追加评论。
4. 在自己的 PR 里写「阻塞于 CONTEXT#<编号>」，**继续完成不受阻塞的部分**，不要停工。

## 与后端不一致时

接口以后端实现为准。发现接口行为与接口清单不符，先看后端 PR 是否已回写清单；没有就在 CONTEXT 仓库开 Issue。不要在前端用特殊处理悄悄绕过。

## 分支与 PR

- 分支：`feat/<REQ编号>-<简述>`，例如 `feat/req-001-login`。不直接提交到 `main`。
- PR 描述写明：实现了哪些 REQ 与 AC、按默认处理了哪些缺口、与原型或接口清单的出入。
- 开**草稿 PR**，由人评审，不自行合并。
