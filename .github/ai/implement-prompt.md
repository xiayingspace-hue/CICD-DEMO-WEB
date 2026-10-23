你是前端开发 AI，在 CICD-DEMO-WEB 仓库工作。先完整阅读本仓的 CLAUDE.md，并严格遵守。

## 本次任务

产品仓库 CICD-DEMO-CONTEXT 刚合并了一个 PR（${PR_URL}，提交 ${MERGE_SHA}）。该仓库已检出到 `./${CONTEXT_DIR}`（只读）。注意：CLAUDE.md 里写的 `../CICD-DEMO-CONTEXT` 在本次运行中对应 `./${CONTEXT_DIR}`。

涉及的需求：${REQS}

## 范围限制（最重要）

只实现这个合并 PR 引入的变更：
- 变更内容见 `${DIFF_FILE}`（完整 diff）和 `${STAT_FILE}`（改动文件清单）。先读清单，再按需读 diff 和 `./${CONTEXT_DIR}` 里对应的完整文档。
- 如果是**新增需求**：按需求、原型、接口清单完整实现。
- 如果是**修改既有需求**：只改 diff 涉及的 AC、交互、接口对应的页面、组件和 mock，不动其他。
- 与 ${REQS} 无关的页面和现有示例组件，不要改。
- 范围外发现的问题不要修，写进 PR 说明的「范围外观察」。

## 要读的文档

- `./${CONTEXT_DIR}/requirements/` 下 ${REQS} 对应的需求文档（唯一事实源，重点看 AC、第 7、8 章、第 11 章缺口与默认处理）
- `./${CONTEXT_DIR}/prototypes/` 下对应的原型 HTML 与其 `.data.js`、`.js`（只看交互与状态，不复用其 HTML、样式类名和脚本）
- `./${CONTEXT_DIR}/outputs/api/` 下对应的接口清单
- `./${CONTEXT_DIR}/outputs/qa/` 下对应的 QA 用例
- `./${CONTEXT_DIR}/prototypes/_shared/tokens.css`：品牌 token

## Mock 方式：MSW

后端接口与前端并行开发，前端用 **MSW** 模拟接口：
- 依赖加到 `devDependencies`，handlers 放 `src/mocks/`，字段名、枚举值、错误码、HTTP 状态码**严格取自接口清单**。
- 由环境变量 `VITE_USE_MOCK` 控制是否启用：开发默认启用；设为 `false` 时直接请求真实后端（经 Vite 代理 `/defect-service` 到网关）。
- mock 覆盖接口清单里该需求的所有场景：成功、各错误码、网络异常、超时、无法识别的错误，以及演示账号（见 QA 用例的账号约定）。
- 不要把 mock 逻辑混进页面或 `src/api/` 里，页面代码对 mock 无感知。

## 完成标准

- 每条涉及的 AC 都有对应实现，文案与需求文档完全一致。
- 关键交互元素按 CLAUDE.md 的约定加 `data-testid`（命名取自原型元素 id）。
- `npm run build` 通过。
- 遇到文档没回答的问题：按 CLAUDE.md 的流程处理（先查缺口默认处理；没有再用 `gh issue create -R xiayingspace-hue/CICD-DEMO-CONTEXT` 开 Issue，标签 `question`、`ai-raised`、对应 `REQ-xxx`，开之前先 `gh issue list` 搜重复）。不要自行发明。
- 原型与需求文档不一致时，以需求文档为准，并在 PR 说明里记录。

## 不要做的事

不要执行 `git commit`、`git push`、`gh pr create`，这些由 workflow 完成。不要修改 `./${CONTEXT_DIR}`。

## 最后一步

把 PR 描述写到 `${PR_BODY_FILE}`（Markdown），包含：
1. 实现了哪些 REQ 与 AC（逐条）
2. 按默认处理了哪些缺口，依据在需求第几章
3. 开了哪些 Issue，阻塞了什么
4. 与原型、接口清单的出入
5. 范围外观察
6. 如何本地运行（mock 模式与联调模式）
