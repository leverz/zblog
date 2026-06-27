---
title: "Context Engineering：Prompt 已死，上下文管理才是 Agent 的命脉"
date: '2026-06-22T08:00:00.000Z'
---

# Context Engineering：Prompt 已死，上下文管理才是 Agent 的命脉

> 原帖：[Rahul on X: Context Engineering for AI Agents](https://x.com/sairahul1/status/2067171101978071501)

---

## 前言：我一开始理解偏了

最近读到一篇讲 Context Engineering 的长帖。

我最初的反应是：这不就是 RAG 的升级版吗？给 agent 接更多外部数据源，让它有充足的上下文来回答问题。

但我被问了一个问题之后，才发现这个理解是反的。

Context Engineering 不是"给更多"，而是"给更精准"。不是"扩充 context"，而是"管理有限 context 里的内容"。

Prompt Engineering 是"写好提示词"。Context Engineering 是"管理模型能看到的一切"——包括什么时候让它看到、什么时候不让它看到。

这个反转是我学习这篇文章的第一个收获。

---

## 一、Context Rot：为什么 agent 跑到第 15 步就崩了

文章开头讲了一个现象："Your AI agent works great for the first 10 steps. Then somewhere around step 15, it starts getting sloppy."

大多数人第一反应是：模型不够强。

但文章说："It's almost never the model. It's what the model is seeing."

这里有两个关键机制：

### 1. Attention 的 n² 复杂度

Transformer 里每个 token 都要 attend 到其他每个 token。context 越长，注意力越稀薄。200K 的窗口，可能在 50K 时就开始显著退化。Claude Code 的用户在 40-60% 容量时就观察到质量下降。

### 2. "Lost in the Middle"问题

LLM 对 context 的记忆呈 U 型曲线：
- 开头记得清楚
- 结尾记得清楚
- 中间被忽略

"Lost in the Middle" 论文显示：关键信息放在中间，准确率下降 30+ 百分点。你的原始指令被 50,000 tokens 的工具输出埋在中间，effectively 消失了。

---

## 二、7 类 Context 竞争者

文章列了 7 样东西在抢同一个有限窗口：

| 类别 | 是什么 | 典型大小 |
|------|--------|----------|
| 1. System Prompt | agent 的身份、行为规则、架构定义 | 几百~几千 tokens |
| 2. Tool Definitions | 每个工具的 schema、参数、使用时机 | 40 个工具 ≈ 10K tokens |
| 3. Tool Call Results | 网页抓取、文件读取、API 返回 | 5K-10K/次 |
| 4. Retrieved Knowledge (RAG) | 向量库检索的文档、搜索结果 | 可变 |
| 5. Conversation History | 完整对话记录 | 线性增长 |
| 6. Memory | 短期（当前会话）+ 长期（跨会话） | 可变 |
| 7. Agent State | 当前计划、todo、进度、scratchpad | 几百 tokens |

关键洞察：不是某一项太大，是 7 项同时竞争。一次复杂任务，System Prompt、Tool Definitions、Tool Call Results（比如 20 条链接摘要）、RAG、Memory、Agent State 会同时存在。其中 Tool Call Results 最可能先成为瓶颈——每处理一条数据就新增 5K-10K tokens，增长最快、最不可控。

---

## 三、四大核心策略

文章把 Context Engineering 的所有技术归纳为 4 个桶：

```
Write → Select → Compress → Isolate
```

### Strategy 1: Write（让 agent 能"记笔记"）

核心思想：Context 会丢，所以让 agent 把重要信息写到外面去。

三种形式：
- Scratchpads：任务中的临时笔记（Anthropic 的 "think" 工具提升 54%）
- Rules Files：持久化程序记忆（CLAUDE.md）
- Memory Extraction：跨会话保存事实

### Strategy 2: Select（只给当下需要的）

核心思想：不要 dump 所有东西，让 agent 自己决定此刻需要什么。

关键区分：
- Traditional RAG: 系统决定 → 用户提问 → 检索文档 → 塞进 prompt → 完成。静态、一次性。
- Agentic RAG: agent 决定 → 搜索、refine 查询、选工具、判断"信息够了没"。动态、迭代。

RAG-MCP 的例子：40+ 个工具全部塞进 context → 14% 选择准确率；用语义搜索只加载相关工具 → 43% 准确率 + token 减半。

### Strategy 3: Compress（保留意义，砍掉 tokens）

三个压缩时机：
- 进入前：大文档分块、rerank、摘要后再入 context
- 工作中：滚动摘要对话历史（保留最近 10 条 + 摘要更早的）
- 行动后：15 步前的工具结果 → 删了或换成一行摘要

Claude Code 的 auto-compaction: 95% 容量时自动压缩完整轨迹。

### Strategy 4: Isolate（不同工作，不同窗口）

核心思想：不是空间问题，是污染问题。研究阶段的杂乱搜索结果，不该在写代码阶段还留在 context 里干扰。

两种隔离方式：
- Sub-agents: 子任务派给子 agent，只返回摘要
- State Schema Isolation: 不同字段存不同类型信息，LLM 只看当前步骤相关的字段

---

## 四、Frequent Intentional Compaction：Dex Horthy 的 3-Phase 工作流

这是文章里最有实操价值的案例：7 小时产出 35,000 行 Rust 代码。

他分了 3 个 phase，每个 phase 结束后重置 context：

### Phase 1 — Research（研究）
- 输入：代码库 + 问题定义
- 做法：子 agent 探索代码、读文件、追踪数据流
- 关键：所有杂乱的 grep 结果和文件内容留在子 agent 的 context 里，不污染父 agent
- 输出：一份 compact 的 `research.md`（文件路径、函数签名、模式、坑点）
- 压缩效果：原始研究占 60-80% context → 压缩到 15-20%

### Phase 2 — Planning（规划）
- 输入：全新的 context window，只包含 `research.md` + 问题定义
- 做法：agent 产出详细实现计划
- 关键：这是最重要的人工检查点——在这里抓逻辑错误是免费的，后面改要几小时
- 输出：实现计划

### Phase 3 — Implementation（实现）
- 输入：又一个全新的 context window，只包含计划
- 做法：agent 按步骤执行
- 辅助：`progress.md` 跟踪已完成/待完成（Write 策略）
- 关键：每个 phase 的 agent 都是 clean、focused 的，没有污染

一个关键细节：如果第 10 条链接抓取失败、重试了 3 次才成功，这些重试记录不应该出现在 Phase 2 的 context 里。因为"中间过程如何"不是有效信息，保留只会消耗 token、干扰结果。

---

## 五、四大失败模式

文章说："Every broken agent you've ever seen falls into one of these."

| 失败模式 | 本质 | 典型症状 | 修复策略 |
|----------|------|----------|----------|
| Context Poisoning | 错误信息进入 context，被后续反复引用 | 第5步的幻觉，在第6-20步被不断放大 | 验证工具输出；压缩失败历史，只保留 resolution |
| Context Distraction | 太长 → 模型过度依赖近期历史，停止思考 | 重复最近的做法，不 synthesize 新计划 | 积极摘要和修剪；大窗口≠填满 |
| Context Confusion | 无关内容导致低质量决策 | 46 个工具时 benchmark 失败，19 个时成功 | 动态工具管理（RAG-MCP） |
| Context Clash | 新信息与旧信息矛盾 | system prompt 说 A，检索文档说 B，agent 行为不一致 | 明确权威顺序：system prompt > 检索事实 > 对话历史 |

我之前遇到 agent 崩了"补充额外信息"的做法，被问到对应哪种失败模式时，我第一反应是 Poisoning，但后来意识到更可能是 Clash——我补充的引导（新信息）和 context 里已有的错误方法（旧信息）矛盾了，agent 看到两条冲突的指令，行为不一致。

Context Poisoning = 错误信息在 context 里不断被引用放大
Context Clash = 两条信息矛盾，agent 无法 reconcile

---

## 六、KV-Cache：被大多数 builder 忽略的 10x 成本因素

原理：LLM 处理 token 时会计算 key-value 表示（昂贵），推理提供商缓存这些表示。如果两次 API 调用的前缀相同 → 复用缓存，只处理新加的 token。如果前缀变了 → 重新计算全部。

Claude Sonnet 的成本差异：
- Cached input: $0.30 / million tokens
- Uncached input: $3.00 / million tokens
- 10x

对 agent 的影响：Agent 每次 turn 都调 API。30-40 次调用 × 10x 差异 = 巨大成本。

优化规则：
1. 稳定内容放 TOP：system prompt、tool definitions（这些每次不变，被缓存）
2. 动态内容放 BOTTOM：对话历史、当前步骤、agent state（这些每次变，但只重新计算变的部分）
3. 不要动态增删工具：会 invalidate 缓存
4. 用 tool masking 代替 tool removal：工具定义保留在 prefix（缓存），只是标记当前不可用

---

## 七、平台对比：不同产品如何处理 Context Engineering

文章对比了 4 个平台，每个有不同的哲学：

| 平台 | 核心策略 | 亮点 |
|------|----------|------|
| Claude Code | Hybrid retrieval + Auto-compaction | CLAUDE.md 前置加载；glob/grep 即时检索；95% 自动压缩；子 agent 隔离 |
| Manus | KV-Cache 感知 + 压缩管道 | 稳定前缀/动态后缀；工具 masking 而非 removal；文件系统作为溢出内存 |
| ChatGPT Agent | 视觉优先 + RL 学习 | GUI 截图作为视觉 token；用 RL 在数千 VM 上学习最优工具策略 |
| Google ADK | 最工程化的架构 | 存储与展示分离；显式命名转换器；默认最小 scope |

所有平台收敛到同一个 5 步循环：

```
Collect → Select → Compress → Arrange → Assemble + Call
```

理解这个循环 = 区分"能 ship 的 builder"和"wondering why agent goes sloppy"的 builder。

---

## 八、综合应用：如果重构一个 agent 系统

假设要重构一个复杂任务生成系统，应用今天学的 4 策略：

1. Write：让 agent 在生成过程中"记"执行日志、计划、状态，存到外部文件系统
2. Select：总结时只找当天的数据，而不是把全部历史塞进 context
3. Compress：每天的数据内容压缩总结，提取关键信息即可
4. Isolate：每个子任务交给子 agent 处理，最后汇总在主 agent，避免主 context 膨胀

被追问"为什么 Write 优先于 Select"时，我意识到：如果 agent 不知道自己要做什么，那 select 什么呢？Write 是维持"知道"的基础设施。

---

## 总结

文章最后一句话：

> "Context engineering is not optional for serious agent work. It is the work."

我读完的感受是：Prompt Engineering 时代确实结束了。未来区分 agent builder 能力的，不是谁写 prompt 更漂亮，而是谁管理 context 更工程化。

关键反转：
- 一开始以为 CE = RAG 升级版（给更多数据）
- 后来理解 CE = 管理有限空间（给更精准的数据）
- 从"Collect → Assemble"的粗放模式，到能设计"Collect → Select → Compress → Isolate → Assemble"的工程化流程

这篇文章值得所有正在做 agent 的人认真读一遍。