# Vercel Projects · 全量项目审计快照

> 采样日期：2026-11-19。数据源：Vercel 项目详情（最新一次部署记录）与 GitHub 项目关联/部分 README。此处公开的是项目资产索引及高层分析，不包含凭据或私有源码。

## 审计范围与证据

- **Vercel 项目：** 51 个；**关联 GitHub：** 49 条；**不同 GitHub 仓库：** 48 个。
- **GitHub 仓库可见性：** Public 8 个；Private 40 个。
- **最新一次部署记录分布：** READY 48、NONE 2、BLOCKED 1。状态可能属于 Preview，不应当作全部生产部署状态。
- **判断限制：** READY 并非 HTTP 可达、域名有效或业务正常的证明；仓库无 README 时，仅进行标有“待核验”的名称级推断。Private 仓库的真实内容与代码**未**在此报告复制。

## 分类清单

| 类别 | 数量 | 项目范围 |
|---|---:|---|
| 应用与效率工具 | 8 | 任务流、文本比较、项目导航与应用界面 |
| 教育与职业 | 7 | 学科地图、招生资料、课程、测评与职业资格 |
| 商业与产业 | 6 | 商业知识、制造业、消费品案例、管理与销售 |
| 金融与政策计算 | 5 | 投资资料、退休政策、个人理财与财务工具 |
| 社会、法律与传播 | 6 | 法律、政策、传播与情感知识 |
| 历史与文化 | 8 | 世界史、区域史、史料与文化专题 |
| 媒体与知识资源 | 9 | 书籍音频、演讲、期刊、知识归档 |
| 研究情报与地图 | 2 | 跨境产业研究、能源报告与地理浏览 |

## 优先处理的发现

- **MBTI：** 先前构建日志确认输出目录不匹配（生成 `dist/`，Vercel 搜索 `public/`）。已调整 Vercel 配置，新的部署需区分 Preview 与 Production 的验收结果。
- **Shanghai School：** 仓库是静态 HTML/JS，2024 年招生资料存在内容陈旧风险；已调整 Vercel 静态产物配置，需实际访问与生产验证。
- **Emotional Expert：** 历史生产部署出现 BLOCKED；新预览部署结果不自动替代生产环境。
- **Theory of Evolution：** 当前 GitHub 仓库只有占位 README，缺少实际网站源码；不能把重试部署当作修复。
- **India Supply Chain Watch：** 已启动首次部署；核心公开信息浏览和需要数据库/验证码的投稿能力必须分别验收。
- **重复仓库映射：** `historical-records`、`historical-records-lu26` 均连接 `1998x-stack/historicalRecords`。
- **项目定位疑点：** Vercel `salary-calculator` 对应仓库 `myMoney`，其 README 描述为个人记账应用，部署与代码定位需确认。

## 逐项目档案

## ⚙️ 应用与效率工具（8）

### ceqt

- **定位：** 四象限任务管理的复杂版本，仓库 README 描述 FastAPI、Next.js、PostgreSQL/Redis 组件。
- **GitHub：** [1998x-stack/CEQT](https://github.com/1998x-stack/CEQT)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/ceqt)。
- **技术证据：** FastAPI / Next.js（仓库描述）；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2026-03-30T12:16:36.570Z。
- **风险：** 需核对 Vercel 上实际运行的前后端模块，不以 README 架构宣称等于已部署。
- **建议：** 核验 API 路由、环境依赖与生产页面。

### ceqt-simple

- **定位：** 四象限任务管理的轻量版，前端可离线运行，提供可选 Python 后端及 LLM 增强。
- **GitHub：** [1998x-stack/CEQTSimple](https://github.com/1998x-stack/CEQTSimple)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/ceqt-simple)。
- **技术证据：** HTML/JS + 可选 Python API；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2026-10-01T07:42:36.141Z。
- **风险：** 与 CEQT 项目目标重叠；需要识别版本定位及域名归属。
- **建议：** 核验静态模式、API 模式及与 CEQT 的关系。

### portfolio

- **定位：** 根据项目名推测为作品集或项目展示；仓库 README 未核验到可用说明。
- **GitHub：** [1998x-stack/portfolio](https://github.com/1998x-stack/portfolio)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/portfolio)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-04T16:08:36.944Z。
- **风险：** 站点内容、框架、维护人和权限边界待核查。
- **建议：** 清点页面内容、外部资源及生产访问测试。

### simple-task-flow

- **定位：** 根据仓库名推测为轻量任务流程应用；具体功能尚缺可核验说明。
- **GitHub：** [1998x-stack/SimpleTaskFlow](https://github.com/1998x-stack/SimpleTaskFlow)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/simple-task-flow)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-06T15:13:48.487Z。
- **风险：** 用途及维护状态尚不明确。
- **建议：** 检查入口文件、依赖、是否仍有使用价值。

### text-compare

- **定位：** 本地优先的文本比较工具，使用 Myers 差异对齐、Web Worker 与虚拟化列表处理长文本。
- **GitHub：** [1998x-stack/TextCompare](https://github.com/1998x-stack/TextCompare)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/text-compare)。
- **技术证据：** Next.js（子目录 text-compare-tool/）；依据级别：`readme`。
- **最近部署：** `READY`；目标：`preview/unspecified`；时间：2026-11-03T06:30:21.217Z。
- **风险：** 需确认 Vercel Root Directory 是否指向实际应用目录。
- **建议：** 核验大文本性能、预览与生产的子目录构建。

### v0-ai-chat-interface

- **定位：** Vercel 上存在 AI 聊天界面项目，但没有绑定 GitHub 仓库，也没有部署记录。
- **GitHub：** 未关联 GitHub；[Vercel 控制台](https://vercel.com/xiemings-projects/v0-ai-chat-interface)。
- **技术证据：** 未核验；依据级别：`vercel-only`。
- **最近部署：** `NONE`；目标：`无记录`；时间：无记录。
- **风险：** 无源码关联、无可审计构建。
- **建议：** 检查 v0 来源，决定归档或接入受控代码仓库。

### v0-analytics-dashboard

- **定位：** Vercel 上存在分析看板项目，但没有绑定 GitHub 仓库，也没有部署记录。
- **GitHub：** 未关联 GitHub；[Vercel 控制台](https://vercel.com/xiemings-projects/v0-analytics-dashboard)。
- **技术证据：** 未核验；依据级别：`vercel-only`。
- **最近部署：** `NONE`；目标：`无记录`；时间：无记录。
- **风险：** 无源码关联、无可审计构建。
- **建议：** 核实是否只是草稿项目，必要时迁移到版本控制。

### web-guide

- **定位：** 卡片式项目导航站，支持搜索、明暗主题及响应式布局。
- **GitHub：** [1998x-stack/webGuide](https://github.com/1998x-stack/webGuide)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/web-guide)。
- **技术证据：** 原生 HTML/CSS/JS；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T03:13:02.972Z。
- **风险：** 与本资产库可能存在功能重叠；需明确两个项目各自职责。
- **建议：** 确认是否合并项目导航数据，避免重复维护。

## 🎓 教育与职业（7）

### elite-day-classes6

- **定位：** 依据仓库名推测为课程班级相关展示项目，具体范围未核验。
- **GitHub：** [1998x-stack/eliteDayClasses6](https://github.com/1998x-stack/eliteDayClasses6)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/elite-day-classes6)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T03:16:58.599Z。
- **风险：** 功能说明及内容出处不充分。
- **建议：** 核查数据、页面与静态资源是否需要维护。

### gao-kao-web

- **定位：** 面向历史高考材料的可检索学科知识地图，包含原始 PDF 归档。
- **GitHub：** [1998x-stack/GaoKaoWeb](https://github.com/1998x-stack/GaoKaoWeb)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/gao-kao-web)。
- **技术证据：** Node 构建静态站点；依据级别：`readme`。
- **最近部署：** `READY`；目标：`preview/unspecified`；时间：2026-11-02T10:11:26.431Z。
- **风险：** 部分历史资料尚待核验，不应误标为当前考试范围。
- **建议：** 检查 PDF 出处、现行适用性和可达性。

### global-think-tank-report-interpretation5

- **定位：** 智库报告解读课程站，采用网页课件与 MP3 资源双形态呈现。
- **GitHub：** [1998x-stack/globalThinkTankReportInterpretation5](https://github.com/1998x-stack/globalThinkTankReportInterpretation5)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/global-think-tank-report-interpretation5)。
- **技术证据：** HTML/JS + 转换脚本；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2026-08-18T09:10:04.357Z。
- **风险：** 引用及音频授权需要逐项核查，避免默认公开传播权限。
- **建议：** 核查资料出处、课程播放及版权边界。

### job-categories

- **定位：** 2021 年版国家职业资格目录浏览系统，提供资格分类和筛选。
- **GitHub：** [1998x-stack/jobCategories](https://github.com/1998x-stack/jobCategories)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/job-categories)。
- **技术证据：** 原生 HTML/CSS/JS；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-09T09:02:08.743Z。
- **风险：** 资格目录为历史版本，不能当作现行规则。
- **建议：** 核对人社部门现行职业资格目录并标注数据日期。

### logic-training

- **定位：** 依据仓库名推测为逻辑训练类学习项目，功能与内容尚待核验。
- **GitHub：** [1998x-stack/logicTraining](https://github.com/1998x-stack/logicTraining)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/logic-training)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:24:03.754Z。
- **风险：** 不应将名称直接视为已验证的课程能力。
- **建议：** 核查题库来源、难度结构及移动端体验。

### mbti

- **定位：** PersonaQuest 情境人格探索问卷，含 12 道题、16 种画像与可解释评分；并非经验证的心理测评。
- **GitHub：** [1998x-stack/MBTI](https://github.com/1998x-stack/MBTI)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/mbti)。
- **技术证据：** 原生静态站 + Node 构建 dist/；依据级别：`readme`。
- **最近部署：** `READY`；目标：`preview/unspecified`；时间：2026-11-19T03:22:34.910Z。
- **风险：** 此前 Vercel 输出目录指向 public，构建实际生成 dist；该配置已修正但新部署待核验。
- **建议：** 核验最新构建 READY 和页面加载，再核查测试结果。

### shanghai-school

- **定位：** 上海高中招生学校名录，提供检索、区域筛选与粘土拟态交互界面。
- **GitHub：** [1998x-stack/shanghai_school](https://github.com/1998x-stack/shanghai_school)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/shanghai-school)。
- **技术证据：** HTML/CSS/JS；依据级别：`readme`。
- **最近部署：** `READY`；目标：`preview/unspecified`；时间：2026-11-19T03:22:56.606Z。
- **风险：** 当前页面引用 2024 年招生数据，内容过时风险；此前部署 ERROR，静态产物配置已调整。
- **建议：** 核验部署、修复链接占位符并更新数据年份及来源。

## 🏢 商业与产业（6）

### business-reference

- **定位：** 据项目名推测为商业参考资料站，尚缺可核验功能说明。
- **GitHub：** [1998x-stack/businessReference](https://github.com/1998x-stack/businessReference)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/business-reference)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:35:56.421Z。
- **风险：** 内容更新、数据来源和适用范围未知。
- **建议：** 核查仓库目录、入口页面、引用及页面访问。

### business-reference2

- **定位：** 商业参考资料的第二版本或独立项目；版本关系未核实。
- **GitHub：** [1998x-stack/businessReference2](https://github.com/1998x-stack/businessReference2)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/business-reference2)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2026-10-01T13:20:48.760Z。
- **风险：** 与 business-reference 可能重复，但不应按名称直接合并。
- **建议：** 比较两仓库实际内容、域名及用户用途，再确定保留策略。

### consumer-product-cases

- **定位：** 据名称推测为消费品案例目录，案例真实性及覆盖范围未核验。
- **GitHub：** [1998x-stack/consumerProductCases](https://github.com/1998x-stack/consumerProductCases)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/consumer-product-cases)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:34:58.696Z。
- **风险：** 缺少可确认的案例口径及来源记录。
- **建议：** 清点案例、来源 URL、时间戳与可检索性。

### key-account-salesperson

- **定位：** 据名称推测为大客户销售知识或工具站，具体功能待核验。
- **GitHub：** [1998x-stack/keyAccountSalesperson](https://github.com/1998x-stack/keyAccountSalesperson)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/key-account-salesperson)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T03:22:02.084Z。
- **风险：** 不能仅凭项目名称认定存在 CRM 或业务数据处理。
- **建议：** 核查是否包含个人信息、销售流程和访问保护。

### lean-management

- **定位：** 据名称推测为精益管理方法或工具站，功能尚待核验。
- **GitHub：** [1998x-stack/leanManagement](https://github.com/1998x-stack/leanManagement)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/lean-management)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:43:29.789Z。
- **风险：** 可能与业务参考类项目重叠，引用及版本需要清点。
- **建议：** 核对内容框架、数据来源、是否需要合并到统一知识目录。

### manufacturing-industry

- **定位：** 据名称推测为制造业知识或信息展示项目，具体内容未核实。
- **GitHub：** [1998x-stack/manufacturingIndustry](https://github.com/1998x-stack/manufacturingIndustry)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/manufacturing-industry)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:44:52.627Z。
- **风险：** 产业数据的年份、来源与完整性待审。
- **建议：** 检查是否具有可追溯指标、分类和数据更新机制。

## 📈 金融与政策计算（5）

### investment-reference

- **定位：** 按项目名推测为投资参考资料站；仓库 README 未核验到可用说明。
- **GitHub：** [1998x-stack/investmentReference](https://github.com/1998x-stack/investmentReference)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/investment-reference)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:30:40.436Z。
- **风险：** 金融内容更新和免责声明缺失风险；不应当作投资建议。
- **建议：** 检查数据来源、时效性、风险提示和用户输入处理。

### market

- **定位：** 依据项目名推测为市场信息展示项目；业务类型尚待仓库内容核实。
- **GitHub：** [1998x-stack/market](https://github.com/1998x-stack/market)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/market)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:31:15.330Z。
- **风险：** 可能与投资参考及商业参考项目有信息重复。
- **建议：** 明确数据市场范围、接口来源与更新频率。

### retirement-policy

- **定位：** 退休政策及养老金测算类网页，README 描述退休年龄时间表、公式与地区比较。
- **GitHub：** [1998x-stack/retirementPolicy](https://github.com/1998x-stack/retirementPolicy)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/retirement-policy)。
- **技术证据：** HTML/CSS/JS（仓库说明）；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-09T16:13:27.005Z。
- **风险：** 政策具有时效和适用条件；页面数值不等同官方个体待遇核定。
- **建议：** 逐条核对最新政策文本、公式、参数及来源日期。

### salary-calculator

- **定位：** Vercel 项目名为 salary-calculator，但 GitHub README 表明其仓库是个人记账和理财单页应用。
- **GitHub：** [1998x-stack/myMoney](https://github.com/1998x-stack/myMoney)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/salary-calculator)。
- **技术证据：** 原生 HTML/CSS/JS；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2026-08-18T09:10:29.198Z。
- **风险：** 项目名称与代码仓库定位不一致，可能连接了错误仓库。
- **建议：** 先确认部署页面是否工资计算器，再决定更名或调整 Git 绑定。

### the-road-to-wealth-freedom-revolution

- **定位：** 根据仓库名推测为财富自由主题知识或教育项目，内容尚待确认。
- **GitHub：** [1998x-stack/theRoadToWealthFreedomRevolution](https://github.com/1998x-stack/theRoadToWealthFreedomRevolution)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/the-road-to-wealth-freedom-revolution)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-18T07:55:53.579Z。
- **风险：** 个人财务相关内容应区分教育材料与具体财务建议。
- **建议：** 核查内容、资料出处、许可及维护计划。

## ⚖️ 社会、法律与传播（6）

### civil-law

- **定位：** 根据仓库名称推测为民法知识站，实际资料范围和法律版本未核验。
- **GitHub：** [1998x-stack/civilLaw](https://github.com/1998x-stack/civilLaw)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/civil-law)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T03:27:06.689Z。
- **风险：** 法律内容具有地区及时间适用性，不能替代专业意见。
- **建议：** 核对法条出处、施行日期、修订历史及站内免责声明。

### communication-studies

- **定位：** 依名称推测为传播学知识展示，尚未核实目录或文献内容。
- **GitHub：** [1998x-stack/communicationStudies](https://github.com/1998x-stack/communicationStudies)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/communication-studies)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T03:17:31.258Z。
- **风险：** 文献许可、引用和全文复制风险待核查。
- **建议：** 抽检出处、引用、目录结构及使用权限。

### emotional-expert

- **定位：** 静态情绪与情感知识网站，通过文章目录和 Python 脚本构建数据索引。
- **GitHub：** [1998x-stack/emotionalExpert](https://github.com/1998x-stack/emotionalExpert)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/emotional-expert)。
- **技术证据：** HTML/CSS/JS + Python 数据脚本；依据级别：`readme`。
- **最近部署：** `READY`；目标：`preview/unspecified`；时间：2026-11-19T03:22:59.879Z。
- **风险：** 此前最新生产部署 BLOCKED，已调整静态构建配置并发起预览验证；不能视为生产恢复。
- **建议：** 查看预览构建和 PDF/文章资源可达性，再决定生产发布。

### labor-law

- **定位：** 根据仓库名称推测为劳动法资料站，具体功能尚未验证。
- **GitHub：** [1998x-stack/laborLaw](https://github.com/1998x-stack/laborLaw)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/labor-law)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T01:59:23.951Z。
- **风险：** 劳动争议及社保政策需要标明时效和地域。
- **建议：** 核验法律依据、典型案例来源及发布时间。

### political-affairs-hall

- **定位：** 依据项目名推测为时政政策知识类网页；缺少可确认的内容说明。
- **GitHub：** [1998x-stack/politicalAffairsHall](https://github.com/1998x-stack/politicalAffairsHall)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/political-affairs-hall)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-25T06:14:09.080Z。
- **风险：** 时政内容更新频繁，不应推断立场或事实准确性。
- **建议：** 核对资料来源、编辑范围、历史版本与内容更新策略。

### the-great-learning-commission4

- **定位：** 根据项目名称推测为教育、学习或政务主题内容站，具体定位待核验。
- **GitHub：** [1998x-stack/theGreatLearningCommission4](https://github.com/1998x-stack/theGreatLearningCommission4)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/the-great-learning-commission4)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:59:12.368Z。
- **风险：** 名称容易造成与官方机构的误解。
- **建议：** 核查页面品牌表述、免责声明和实际内容归属。

## 🏛️ 历史与文化（8）

### brief-history-of-russia

- **定位：** 根据仓库名推测为俄罗斯历史主题知识站，内容真实性需独立验证。
- **GitHub：** [1998x-stack/briefHistoryOfRussia](https://github.com/1998x-stack/briefHistoryOfRussia)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/brief-history-of-russia)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:29:04.490Z。
- **风险：** 历史叙述需要区分事件事实与争议观点。
- **建议：** 建立来源、时间、争议字段并审查素材授权。

### dragon-slaying-techniques

- **定位：** 根据项目名无法可靠判断业务范围；暂归文化/知识类待复核。
- **GitHub：** [1998x-stack/dragonSlayingTechniques](https://github.com/1998x-stack/dragonSlayingTechniques)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/dragon-slaying-techniques)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-25T06:21:36.996Z。
- **风险：** 标题含义模糊，分类可信度低。
- **建议：** 读取仓库实际入口与内容，再确认分类归属。

### european-history

- **定位：** 根据仓库名推测为欧洲历史内容站，实际目录与内容来源待核验。
- **GitHub：** [1998x-stack/EuropeanHistory](https://github.com/1998x-stack/EuropeanHistory)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/european-history)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T03:04:59.418Z。
- **风险：** 可能涉及历史地图或译文版权问题。
- **建议：** 检查地图、引文和可视化资料的使用权。

### historical-records

- **定位：** 历史记录主题项目；与 historical-records-lu26 关联同一个 GitHub 仓库。
- **GitHub：** [1998x-stack/historicalRecords](https://github.com/1998x-stack/historicalRecords)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/historical-records)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T01:43:30.829Z。
- **风险：** 两个 Vercel 项目共享 GitHub 源码，存在重复发布和域名分叉风险。
- **建议：** 比较环境变量、域名与历史版本，确认两个站是否都要保留。

### historical-records-lu26

- **定位：** 与 historical-records 相同的 GitHub 代码源，可能是历史部署或独立发布入口。
- **GitHub：** [1998x-stack/historicalRecords](https://github.com/1998x-stack/historicalRecords)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/historical-records-lu26)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T01:43:30.819Z。
- **风险：** 共享源码不代表部署内容或配置完全相同，需逐项目对照。
- **建议：** 核对部署分支、预览域名及是否需要合并项目。

### history-of-world-civilization

- **定位：** 按名称推测为世界文明史浏览或整理项目，内容结构尚待核验。
- **GitHub：** [1998x-stack/historyOfWorldCivilization](https://github.com/1998x-stack/historyOfWorldCivilization)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/history-of-world-civilization)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:05:27.438Z。
- **风险：** 历史主题涉及来源与解释分歧，不能将未审资料视为史实结论。
- **建议：** 检查时间轴、史料出处、学术引用与内容授权。

### modern-history

- **定位：** 根据仓库名推测为近现代史资料展示项目，文献范围未核验。
- **GitHub：** [1998x-stack/modernHistory](https://github.com/1998x-stack/modernHistory)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/modern-history)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-11T16:39:11.656Z。
- **风险：** 资料年代跨度及来源需明确。
- **建议：** 核查专题划分、史料出处与数据校核。

### theory-of-evolution

- **定位：** 仓库 README 明确当前只有占位内容，尚无完整网站源码。
- **GitHub：** [1998x-stack/theoryOfEvolution](https://github.com/1998x-stack/theoryOfEvolution)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/theory-of-evolution)。
- **技术证据：** 空仓库占位（README）；依据级别：`readme`。
- **最近部署：** `BLOCKED`；目标：`production`；时间：2026-08-18T09:32:01.337Z。
- **风险：** 此前生产部署 BLOCKED；当前缺乏可构建的真实网站内容。
- **建议：** 先补充最小可用知识站及资料来源，再审查首次发布。

## 📚 媒体与知识资源（9）

### energy-frontiers-report

- **定位：** 六个系列、28 个 HTML 课件与 22 个 MP3 的历史能源课程档案，实际并非实时能源产业研究报告。
- **GitHub：** [1998x-stack/energyFrontiersReport](https://github.com/1998x-stack/energyFrontiersReport)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/energy-frontiers-report)。
- **技术证据：** 直接核对了 `index.html`、`scripts.js`、`data.js`、`convert.py` 和 Git Tree；音频与 HTML 资产总计约 472 MiB。依据级别 `source-inspection`，不表示已核验课程原文版权。
- **最近生产部署：** `READY`；目标 `production`；时间 2025-06-12T03:21:49.176Z；尚未更新至最新 PR。
- **代码优化进度：** [源仓 PR #1](https://github.com/1998x-stack/energyFrontiersReport/pull/1) 已实现课程实际统计、全文标题检索、上一节/下一节、错误状态、移动端和无障碍及 CI，但当前**未合并**。最新提交 `1e38c3cd` 的 Vercel Preview `READY`（`dpl_2rDJ4YYSasGzKg3kBxc8dYhxfSS8`），GitHub Actions 在私有仓库启动前多次失败，未分配 runner，无实际测试执行。
- **P0 风险：** 私有仓库不代表生产域名私有；课程复制与音频网上传播授权未验证。Vercel 原 SSO 主要覆盖 Preview/生成部署 URL，生产主域名公开性尚未独立检查。
- **下一步：** 确认课程内容授权/私有访问策略，排查 GitHub Actions 账户/计费/runner 状态，完成真实音频与手机 E2E；在通过质量门禁前不要声称代码已发布。
- **专项审计：** [历史课程平台与部署风险](iterations/energy-frontiers-archive-2026-11-19.md)。

### caixin-weekly

- **定位：** 名称表明与期刊或财经内容相关，但仓库功能与资料许可尚未核验。
- **GitHub：** [1998x-stack/caixinWeekly](https://github.com/1998x-stack/caixinWeekly)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/caixin-weekly)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-25T06:34:28.773Z。
- **风险：** 期刊内容可能涉及版权限制；不应推断可以公开转载。
- **建议：** 核查内容许可、引用边界与文章入口。

### cat-brother-world

- **定位：** 名称不足以准确识别项目用途，暂归媒体与内容类待复核。
- **GitHub：** [1998x-stack/catBrotherWorld](https://github.com/1998x-stack/catBrotherWorld)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/cat-brother-world)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T09:42:12.599Z。
- **风险：** 分类可靠性较低，当前仅有项目关联证据。
- **建议：** 阅读站点入口与说明后重新分类。

### founder-notes

- **定位：** 据名称推测为创始人笔记或创业知识站，具体结构未核验。
- **GitHub：** [1998x-stack/FounderNotes](https://github.com/1998x-stack/FounderNotes)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/founder-notes)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T07:35:02.089Z。
- **风险：** 缺少可确认的知识版权与数据更新规则。
- **建议：** 补齐 README、标签、来源与检索入口。

### gu-heng-speaksof-good-books

- **定位：** 从项目命名和 Vercel Git 关联可确认是书籍音频相关项目；最近有音频知识管线开发分支触发大量预览部署。
- **GitHub：** [1998x-stack/GuHengSpeaksofGoodBooks](https://github.com/1998x-stack/GuHengSpeaksofGoodBooks)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/gu-heng-speaksof-good-books)。
- **技术证据：** 未全面核验；依据级别：`vercel-metadata`。
- **最近部署：** `READY`；目标：`preview/unspecified`；时间：2026-11-19T03:20:20.927Z。
- **风险：** 预览部署频繁排队/取消，需区分正常提交触发与异常构建风暴。
- **建议：** 检查部署忽略规则、生产分支、音频授权与日志。

### lu-ke-wen

- **定位：** 据名称推测为人物相关观点或资料目录，具体材料类型未知。
- **GitHub：** [1998x-stack/luKeWen](https://github.com/1998x-stack/luKeWen)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/lu-ke-wen)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T05:41:41.182Z。
- **风险：** 采访、文章、音视频的公开转载权限待核验。
- **建议：** 检查版权来源、分类结构及搜索体验。

### science-reference

- **定位：** 据名称推测为科学知识参考资料站，实际主题和资料范围未核验。
- **GitHub：** [1998x-stack/scienceReference](https://github.com/1998x-stack/scienceReference)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/science-reference)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T02:26:17.180Z。
- **风险：** 科学内容更新与结论证据需要可追溯。
- **建议：** 补充来源 DOI/URL、发布日期及争议提示。

### see-world

- **定位：** 据名称推测为世界观察与资料展示类网页，内容范畴待确认。
- **GitHub：** [1998x-stack/seeWorld](https://github.com/1998x-stack/seeWorld)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/see-world)。
- **技术证据：** 未核验；依据级别：`name-only`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-25T06:30:23.808Z。
- **风险：** 外部新闻和图片应核查出处与时效。
- **建议：** 检查资料元数据、链接可用性与更新日期。

### ted

- **定位：** 仓库 README 主要列出 TED 历史演讲对应 PDF 索引，而非规范化软件架构说明。
- **GitHub：** [1998x-stack/TED](https://github.com/1998x-stack/TED)（private）；[Vercel 控制台](https://vercel.com/xiemings-projects/ted)。
- **技术证据：** 资料索引（网站实现未核验）；依据级别：`readme`。
- **最近部署：** `READY`；目标：`production`；时间：2025-06-12T05:18:27.432Z。
- **风险：** 演讲文稿/资料再分发的版权与许可需核验。
- **建议：** 明确站点公开展示内容及 PDF 授权，建立检索元数据。

## 🌏 研究情报与地图（2）

### india-supply-chain-watch-2po3

- **定位：** 印度电子制造与跨境政策资料索引，研究库 31 条、选择性获批项目记录 20 条；不作为实时全行业统计。
- **GitHub：** [1998x-stack/india-supply-chain-watch](https://github.com/1998x-stack/india-supply-chain-watch)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/india-supply-chain-watch-2po3)。
- **技术证据：** Next.js 15.5、React 19、Prisma 6；CI 已通过内容核验、CSV 一致性、TypeScript、生产构建和 12 路由只读 HTTP 冒烟。
- **最近部署：** `READY`；环境 `production`；commit `42672baa`；部署 `dpl_4k5R3MqmL8rduESvPCg2mDrjqPM3`；时间 2026-11-19T04:15:10.747Z。
- **研究增量：** 新增 2026-11-06 ECMS 12 项获批申请与累计 118 项统计、2026-09-25 PCB Tools Final Findings 进度、2026-08-21 印度 FDI 修订框架实施情况；三个专题同步更新。详情 [专项来源复核](iterations/india-watch-official-source-refresh-2026-11-19.md)。
- **已修复：** JSON→CSV 自动生成与 CI 漂移检查、历史来源逐条核验日期显示、静态来源回归测试。
- **保留风险：** 28 条历史研究记录仍保留 2026-09-24 旧核验日期；匿名公网访问、真实 PostgreSQL、Turnstile 和管理审核未完成独立测试。
- **建议：** 执行外部生产网站验活，复核早期政策来源，谨慎启用投稿和完善依赖锁文件；不要将平台 READY 误作所有业务功能已验证。

### shanghai-map

- **定位：** 上海地图技术演示，提供上海中心参考视图、地理范围查看、响应式地图和可追溯的底图说明。
- **GitHub：** [1998x-stack/shanghai_map](https://github.com/1998x-stack/shanghai_map)（public）；[Vercel 控制台](https://vercel.com/xiemings-projects/shanghai-map)。
- **技术证据：** HTML/CSS/JS + Leaflet 1.9.4 SRI、OSM 瓦片政策化配置；GitHub Actions 已通过地图事件模拟测试、来源静态校验和 5 路由 HTTP 冒烟。
- **最近部署：** `READY`；目标：`production`；commit `0185bda4`；部署 `dpl_FBRW4wjX3PkQAdaaTvhwXKhUYa6F`；时间 2026-11-19T05:10:46.736Z。
- **修复记录：** 删除未核验人口数字，明确来源与 WGS84 参考点，避免将 `fitBounds` 误作行政边界；优化移动端布局、键盘缩放同步、第三方瓦片失败提示、Vercel 安全头与静态健康探针。
- **保留风险：** 生产匿名公网访问与真实手机 UI 尚未验收；OSM 瓦片无 SLA；上海/中国境内正式地图服务涉及审图、资质与数据授权，不能因 Production READY 推断已合规。
- **建议：** 按 [本轮专项审计报告](iterations/shanghai-map-2026-11-19.md) 进行真实 HTTP/触控验证及底图合规评估，在取得授权前不增加 POI/边界或地理位置上传。

## 限制、更新时间与后续验收

- 所有结论截至 **2026-11-19** 的逐项查询快照，不包含每个网站的 HTTP 冒烟测试结果或 Runtime Logs 审查。
- 私有 GitHub 仓库的名称和连接关系按照用户本次明确要求整理；公开网站不能访问其私有内容，不应将仓库名等同于公开授权。
- 生产级验收需补充：production READY、生产域名验证、HTTP 响应、关键交互、错误日志、可用性和隐私审查。
- 更新数据后请同步运行 `npm run check`、`npm test` 和 `npm run build`；参见 [方法论](METHODOLOGY.md)。
