# JHora Usage Guide

本文件是 `yinzhan` 工作流的 JHora 工具使用指南，定义工具调用、数据源优先级、证据账本、BAV/SAV 映射、Dasha/Transit/Tajaka 使用边界与异常降级规则。

本文件只处理 JHora 工具与数据口径，不承载具体 step 的业务断语。具体步骤仍以 `task_read` 返回的当前 step 描述和对应 step prompt 为准。

## 1. 适用范围与读取时机

涉及以下任一内容时，必须先读取并遵守本文件：

- 调用 `jhora_*` MCP 工具。
- 使用 `workspace/input/jhora_extended.json` 或 `workspace/jhoratools/*.json` 中的数据。
- 给出 Dasha、Transit、Tajaka、BAV/SAV、Shadbala、Vimsopaka、Arudha、Yoga、Vargas 分盘等工具证据。
- 处理 live JHora 输出与静态导出、旧步骤结论之间的冲突。
- 在 MD/AD/PD 时间片步骤中给出具体时间窗口。

## 2. JHora 数据源优先级

默认优先级如下：

1. 当前 run 的 live JHora MCP 查询结果，保存于 `workspace/jhoratools/*.json`。
2. 当前 run 的 `workspace/input/jhora_extended.json` 静态导出。
3. 既有步骤产物中的已审查证据。
4. 旧 run、迁移文件或历史口径，只能作为背景，不得作为主证。

调用 live JHora MCP 工具时，优先复用 `workspace/input/jhora_session.json` 中已有的 `session_id`，不得在同一 run 内无故重复创建会话。

若 live JHora 与静态导出或旧步骤结论冲突，以 live JHora 最新输出为准；冲突项必须写入 `note.md`，且不得继续作为 high/critical 断语的主证。

## 3. 工具调用与产物账本模板

时间片步骤和任何大量依赖 JHora 工具的步骤，产物开头必须包含数据源账本。

```md
> 数据源与口径：
> - Dasha 边界：`jhoratools/jhora_dasha-*.json`，说明 MD/AD/PD rows 是否真实返回。
> - Transit 快照：`jhoratools/jhora_transit-*.json`，列出关键日期与用途。
> - BAV/SAV：`jhoratools/jhora_ashtakavarga-*.json` 或 `input/jhora_extended.json.rekha`，说明映射口径。
> - 分盘：live `jhora_query` 或 `input/jhora_extended.json.data.vargas`，说明不可用时的降级方式。
> - Tajaka：列出文件编号；若出现 sign 解码异常，不得作为强证。
> - 口径冲突：live JHora 与静态导出冲突时，以 live 为准；冲突项不得作为主证。
```

## 4. 强制调用场景

以下情况必须具备对应 live JHora 工具结果；先复用 `workspace/jhoratools/*.json` 中已导出的同类结果，若缺失、过期、粒度不足或口径冲突，再调用对应工具，不得只凭 `jhora_extended.json` 或记忆推断：

- Shadbala / Vimsopaka 精确分值：`jhora_query(include=["planets","shadbala","vimshopak"])`
- Ashtakavarga 宫气分值：`jhora_ashtakavarga(type="SAV|BAV|KAKSHYA")`
- Dasha 精确边界：`jhora_dasha`
- 行运窗口或过境快照：`jhora_transit`
- 领域分盘行星状态：`jhora_query(include=["planets"], div="D10")` 等；若 live 不支持，必须声明降级到 `jhora_extended.json.data.vargas`。
- Tajaka 年度盘或 Pravesha：`jhora_tajaka` / `jhora_pravesha`
- 完整 Yoga 枚举：`jhora_query(include=["yoga"])`
- Arudha Lagna 精确落位：`jhora_query(include=["arudha"])`
- Bhava Bala 宫位强度：`jhora_query(include=["bhava_bala"])`
- Drishti 相位强度：`jhora_query(include=["drishti","drishti_strength"])`
- 婚恋合盘评分：`jhora_match(native_session_id=..., partner_session_id=..., detail=true)`

## 5. Dasha 查询与展开策略

- 优先使用 `as_of` 查询当前时点层级：`jhora_dasha(as_of="YYYY-MM-DD", depth="md")`。
- 需要某段 MD 内 AD 列表时，使用 `path` 定点展开，不得直接全量枚举 MD/AD/PD。
- 只有 PD 钻取步骤才展开到 PD 层。
- 若 `secondary_rows` 为空，不得写成“工具已返回 AD rows”。可临时使用 `task_read` 返回的已声明“规划刻度”，但必须标注待工具 rows 回写。
- 若后续工具返回真实 AD/PD rows，必须以真实 rows 覆盖规划刻度，并在 `note.md` 留痕。

## 6. Transit 触发有效性判断

时间片分析采用：Dasha 定方向，Transit 给扳机，BAV 验有效，Tajaka 补跨年，Yoga 看激活。

- AD 分析必须检查本 AD 时间窗口内土星、木星、Rahu/Ketu 的关键换座或关键过境。
- high/critical 时间断语必须同时满足 Dasha 层方向与 Transit 层触发。只有一层满足时，结论降级为 medium 或以下。
- Transit 断语必须附 BAV 有效性判断。BAV < 4 时，对应 transit 触发力降级。
- 行运窗口必须有具体日期或月份锚点，不得只写“近期”“某段时间”。

## 7. BAV/SAV 星座到宫位映射算法

Transit BAV 判断顺序：

1. 确认命主 D1 Lagna 与整宫映射。
2. 确认行运星当前所在星座。
3. 将该星座换算为命主 D1 的第 N 宫。
4. 读取“该行运星”的 BAV 分值，不得用 SAV 或其他行星 BAV 替代。
5. 在证据中写明：`Transit Jupiter @ Gemini = D1 2H；Jupiter BAV(Gemini)=6，>=4，有效`。
6. 若 BAV < 4，相关 transit 断语必须降级，不得给 high/critical。
7. BAV/SAV 的计算与映射仅限 D1 Rashi Chart（本命主盘）。严禁将 BAV/SAV 概念应用于 D9、D10、D2、D7、D30 等任何 Vargas 分盘；领域分盘只能用于事件性质与质量判断，不能挂接 BAV/SAV 分值。

SAV 使用边界：SAV 可用于 D1 宫位总体容量、顺逆势和主题强弱判断；Transit 有效性必须优先使用对应行运星的 BAV。

## 8. 分盘数据来源与降级规则

- live `jhora_query(div="D10")` 等可用时，优先使用 live 分盘数据。
- 若 live 工具暂不支持某分盘，允许降级使用 `input/jhora_extended.json.data.vargas.{div}`，但必须在产物开头说明。
- 分盘用于判断领域事件的性质与质量，例如 D10 判事业事件性质、D9 判婚恋承诺质量、D2 判财富极性。
- 分盘不得直接承载 D1 专属的 BAV/SAV 分值判断。
- 若分盘只有落宫结构，没有度数、强弱、avastha 或量化指标，相关结论必须降低置信度。

## 9. live/static 数据口径冲突处理

若 live JHora 输出与静态导出（如 `jhora_extended.json`）或旧步骤结论冲突：

1. live JHora 最新输出优先。
2. 冲突项写入 `note.md`。
3. 冲突项不得继续作为主证。
4. 已受影响的下游产物必须回写修正，或在当前产物中明确不再沿用旧口径。
5. 若必须保留旧口径，只能标注为“历史导出口径/待复核”，不得用于 high/critical 断语。

典型例子：若旧静态导出显示 `Mercury loser / Venus winner`，但 live `jhora_query` 返回 `war_count=0`，则不得继续把 Mercury-Venus Graha Yuddha 作为当前主证。应改用 live 可验证结构证据，例如行星落宫、宫主关系、Shadbala、Vimsopaka、SAV/BAV 等。

## 10. Tajaka 与异常工具输出处理

- AD 跨自然年边界时，必须调用 Tajaka 作年度盘补证。
- Tajaka 是辅助证据，不得作为单点强断的唯一依据。
- 若 Tajaka 返回字段异常，例如行星 sign 解码全为 0，必须明确标注异常，不得作为 high/critical 主证。
- 若 Tajaka 与 Dasha+Transit 指向一致，可提升为辅助增强；若三者冲突，以 Dasha+Transit+BAV 的可验证链条为主。

## 11. Eclipse 与 Panchanga 可选验证

- 当土星/木星换座窗口与日月食节点重叠时，可调用 `jhora_eclipse` 获取具体食相时刻。
- 给出行动建议（结婚、签约、开业等）时，可调用 `jhora_panchanga` 或 `jhora_monthly_panchanga` 验证 Tithi/Yoga/Nakshatra；若未验证，不得给出“吉时”级建议。

## 12. Checker 独立核验清单

checker 审核 JHora 相关结论时，优先核验：

- Dasha 边界是否来自真实 `jhora_dasha` rows。
- Transit 窗口是否有保存的快照文件。
- BAV 映射是否按 D1 Lagna 和行运星自己的 BAV 计算。
- 是否误把 BAV/SAV 套到 D9/D10 等 Vargas。
- live/static 冲突是否已说明并降级。
- Tajaka 异常是否被错误当作强证。
- 分盘不可用时是否声明了降级来源。
