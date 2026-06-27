---
title: "Context Engineering：Prompt 已死，上下文管理才是 Agent 的命脉"
date: '2026-06-22T08:00:00.000Z'
---

# Context Engineering：Prompt 已死，上下文管理才是 Agent 的命脉

> 原帖：[Rahul on X: Context Engineering for AI Agents: The Complete Playbook](https://x.com/sairahul1/status/2067171101978071501)

---

## 前言：我一开始理解偏了

最近读到一篇讲 Context Engineering 的长帖。

我最初的反应是：这不就是 RAG 的升级版吗？给 agent 接更多外部数据源，让它有充足的上下文来回答问题。

但我被问了一个问题之后，才发现这个理解是反的。

Context Engineering 不是"给更多"，而是"给更精准"。不是"扩充 context"，而是"管理有限 context 的效用"。

这个反转让我印象很深。因为我在自己的鸢-信息流系统里，就遇到过 agent 跑到后面开始"失忆"的情况。我当时的做法是"补充额外信息引导它"——这其实是症状治疗，不是根因处理。

这篇文章让我意识到：agent 不是变笨了，是它的 RAM 满了。

---

## 一、Context Rot：你的 Agent 为什么在第 15 步开始变蠢

文章开头描述了一个很常见的现象：

> "Your AI agent works great for the first 10 steps. Then somewhere around step 15, it starts getting sloppy."

大多数人第一反应是：模型不够强。

但文章说："It's almost never the model. It's what the model is seeing."

这里有两个关键机制：

### 1. Attention 的 n² 复杂度

Transformer 里每个 token 都要 attend 到其他每个 token。context 越长，注意力越稀薄。200K 的窗口，可能在 50K 就开始显著退化。

### 2. "Lost in the Middle"

LLM 对 context 的记忆呈 U 型曲线：
- 开头记得清楚
- 结尾记得清楚
- 中间 largely ignored

你的原始指令——被 50,000 tokens 的工具输出埋在中间——effectively 消失了。

我读到这个的时候立刻联想到自己的系统：如果鸢-信息流一次要处理 20 条链接，第 3 条链接的信息到了第 20 步还能被准确召回吗？根据这个原理，答案很可能是不能。

---

## 二、7 类 Context 竞争者：谁在抢你的 RAM

文章列了一个很清晰的清单。你的 agent 的 context window 里，同时存在这 7 类东西：

1. **System Prompt** — agent 的身份、行为规则、架构定义
2. **Tool Definitions** — 每个工具的 schema，40 个工具 ≈ 10K tokens
3. **Tool Call Results** — 网页抓取、文件读取，5K-10K/次
4. **Retrieved Knowledge (RAG)** — 向量库检索的文档
5. **Conversation History** — 完整对话记录，线性增长
6. **Memory** — 短期 + 长期记忆
7. **Agent State** — 当前计划、todo、进度

不是某一项太大，是 7 项同时竞争。

我在自己的系统里对号入座：一次晨报生成任务，System Prompt、Tool Definitions、Tool Call Results（20 条链接摘要）、RAG、Memory、Agent State 会同时存在。其中读取摘要最可能先成为瓶颈——每处理一条链接就新增 5K-10K tokens，增长最快、最不可控。

---

## 三、四大核心策略：Write / Select / Compress / Isolate

这是整篇文章的骨架。所有 context engineering 技术都归到这 4 个桶里。

### Strategy 1: Write — 让 Agent 能"记笔记"

Context 会丢，所以让 agent 把重要信息写到外面去。

三种形式：
- Scratchpads：任务中的临时笔记（Anthropic 的 "think" 工具提升 54%）
- Rules Files：持久化程序记忆（CLAUDE.md）
- Memory Extraction：跨会话保存事实

我读到这的时候立刻想到：我的鸢-信息流系统其实已经在做 Write——Obsidian 归档就是信息持久化。只是没有系统化。

### Strategy 2: Select — 只给当下需要的

关键区分：
- Traditional RAG：系统决定检索什么，一次性塞进 prompt
- Agentic RAG：agent 自己决定需要什么，动态搜索

RAG-MCP 的例子：40 个工具全部塞进 context → 14% 选择准确率。用语义搜索只加载相关工具 → 43% 准确率 + token 减半。

### Strategy 3: Compress — 保留意义，砍掉 Tokens

三个压缩时机：
- 进入前：大文档分块、rerank、摘要
- 工作中：滚动摘要对话历史（保留最近 10 条 + 摘要更早的）
- 行动后：15 步前的工具结果 → 删了或换成一行摘要

Claude Code 的 auto-compaction：95% 容量时自动压缩完整轨迹。

### Strategy 4: Isolate — 不同工作，不同窗口

核心思想：不是空间问题，是污染问题。

研究阶段的杂乱搜索结果，不该在写代码阶段还留在 context 里干扰。

两种隔离方式：
- Sub-agents：子任务派给子 agent，只返回摘要
- State Schema Isolation：不同字段存不同类型信息，LLM 只看当前相关的

---

## 四、我卡住的地方：Frequent Intentional Compaction

文章提到 Dex Horthy 的方法：7 小时产出 35,000 行 Rust 代码。关键是分 phase，每个 phase 结束后**重置 context**。

我一开始不太理解怎么应用到自己的系统。被引导之后才明白：

**晨报生成可以类比为 3 个 phase：**

| Phase | 输入 | 输出 | 关键操作 |
|-------|------|------|----------|
| **Research** | 20 条链接 | `clips-summary.md` | 每条链接独立处理，只保留摘要 |
| **Planning** | `clips-summary.md` | `morning-post-outline.md` | 决定结构、选 Top N、找关联 |
| **Implementation** | `outline.md` | 最终晨报 | 按结构写各段落 |

每个 phase 结束后，前一 phase 的原始工具输出（网页全文、中间错误、重试记录）都被丢弃，只保留压缩后的 artifact。

一个关键细节：如果第 10 条链接抓取失败、重试了 3 次才成功，这些重试记录不应该出现在 Phase 2 的 context 里。因为"中间过程如何"不是有效信息，保留只会消耗 token、干扰结果。

---

## 五、四大失败模式：你的 Agent 是怎么崩的

| 失败模式 | 本质 | 典型症状 |
|----------|------|----------|
| **Context Poisoning** | 错误信息进入 context，被后续反复引用 | 第 5 步的幻觉，在第 6-20 步被不断放大 |
| **Context Distraction** | 太长 → 模型过度依赖近期历史，停止思考 | 重复最近的做法，不 synthesize 新计划 |
| **Context Confusion** | 无关内容导致低质量决策 | 46 个工具时 benchmark 失败，19 个时成功 |
| **Context Clash** | 新信息与旧信息矛盾 | system prompt 说 A，检索文档说 B，行为不一致 |

我反思了自己之前"agent 崩了补充额外信息"的做法。被问到对应哪种失败模式时，我第一反应是 Poisoning，但后来意识到更可能是 Clash——我补充的引导（新信息）和 context 里已有的错误方法（旧信息）矛盾了，agent 看到两条冲突的指令，行为不一致。

---

## 六、KV-Cache：被大多数 Builder 忽略的 10x 成本因素

这是一个技术细节，但文章强调"worth 10x cost savings"。

原理：LLM 处理 token 时会计算 key-value 表示（昂贵），推理提供商缓存这些表示。如果两次 API 调用的前缀相同 → 复用缓存，只处理新加的 token。

Claude Sonnet 的成本差异：
- Cached input: $0.30 / million tokens
- Uncached input: $3.00 / million tokens
- 10x

优化规则：
1. 稳定内容放 TOP（system prompt、tool definitions）→ 被缓存
2. 动态内容放 BOTTOM（对话历史、当前步骤）→ 只重新计算变的部分
3. 不要动态增删工具 → 会 invalidate 缓存
4. 用 tool masking 代替 tool removal

我意识到：如果鸢-信息流每次生成晨报都重新加载所有 tool definitions，而不是让它们稳定在 context 顶部，日积月累会消耗大量 token。

---

## 七、平台对比：Claude Code / Manus / ChatGPT Agent / Google ADK

| 平台 | 核心策略 |
|------|----------|
| **Claude Code** | Hybrid retrieval + Auto-compaction at 95% |
| **Manus** | KV-Cache 感知 + 工具 masking |
| **ChatGPT Agent** | 视觉优先 + RL 学习 |
| **Google ADK** | 最工程化：存储与展示分离、显式转换器、默认最小 scope |

所有平台收敛到同一个 5 步循环：

```
Collect → Select → Compress → Arrange → Assemble + Call
```

我评估自己的系统：目前更接近 "Collect → Assemble"，跳过了 Select、Compress、Arrange。这也是最大的优化空间。

---

## 八、如果重构鸢-信息流，我会怎么做

被问到"为每个策略举一个具体改动"时，我的设计：

| 策略 | 改动 |
|------|------|
| **Write** | 执行日志、计划、状态 → 存到 Obsidian log folder |
| **Select** | 总结时只找当天 clips，不是全部历史 |
| **Compress** | 每天 clips 提取关键信息，从原始内容到精华 |
| **Isolate** | 每个 clip 子 agent 独立总结，主 agent 只汇总 |

被追问"为什么 Write 优先于 Select"时，我意识到：如果 agent 不知道自己要做什么，那 select 什么呢？Write 是维持"知道"的基础设施。

---

## 总结

文章最后一句话：

> "Context engineering is not optional for serious agent work. It is the work."

我读完的感受是：Prompt Engineering 时代确实结束了。未来区分 agent builder 能力的，不是谁写 prompt 更漂亮，而是谁管理 context 更工程化。

我在这次学习中的关键反转：
- 一开始以为 CE = "给 agent 更多数据"
- 后来理解 CE = "在有限 RAM 里，确保 agent 看到对的、在对的格式、在对的时机"
- 一开始处理 agent 崩了是"补充信息引导"
- 现在会考虑"分 phase + 重置 context + 主动压缩"

---

> 原帖：[Rahul on X](https://x.com/sairahul1/status/2067171101978071501)  
> 学习日期：2026-06-22  
> 学习方式：苏格拉底式问答
