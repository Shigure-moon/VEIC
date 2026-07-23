import { Icons } from "@/components/icons";
import type { ReactNode } from "react";
import {
  AppWindow,
  Bot,
  Boxes,
  BrainCircuit,
  BriefcaseBusiness,
  Code2,
  Database,
  FileText,
  FolderKanban,
  HardDrive,
  House,
  Images,
  Network,
  ShieldCheck,
  Terminal,
  Workflow,
} from "lucide-react";

type TimelineLink = {
  title: string;
  icon: ReactNode;
  href: string;
};

export const DATA = {
  name: "龙勇君 / YJ_Long_SHIGURE",
  url: "https://github.com/Shigure-moon",
  location: "成都，中国",
  locationLink: "https://www.google.com/maps/place/Chengdu",
  description: "机器人软件 · AI 工程应用 · 技术支持",
  summary:
    "以 C++、ROS、Linux 和嵌入式知识为底座，熟悉使用 AI 工具辅助代码分析、技术文档整理和工程问题定位。面对新的软硬件平台，我会先建立环境、证据与业务边界，再快速形成可运行工具、可复现流程和清晰交付。",
  ogImage: "/projects/alpha-01.png",
  sections: {
    about: { order: 1, enabled: true, heading: "关于我" },
    work: { order: 2, enabled: true, heading: "工作经历", presentLabel: "至今" },
    education: { order: 3, enabled: false, heading: "教育经历" },
    skills: { order: 4, enabled: true, heading: "技术与工程能力" },
    projects: {
      order: 5,
      enabled: true,
      label: "核心项目",
      heading: "项目与工程实践",
      text: "围绕真实业务问题，展示我如何理解系统、建立技术边界、完成验证并沉淀可复用交付。",
    },
    hackathons: {
      order: 6,
      enabled: true,
      label: "更多项目",
      heading: "持续推进的工程记录",
      text: "另外 {count} 个项目覆盖日志智能、ROS2 导航、物联网安全和多机器人协同。",
    },
    photos: {
      order: 7,
      enabled: true,
      heading: "项目界面与工程证据",
    },
    contact: {
      order: 8,
      enabled: true,
      label: "联系",
      heading: "从具体问题开始",
      text: "机器人软件、技术支持工具、边缘设备连接或 AI 工程应用，都可以从具体设备、业务场景和当前目标开始讨论。",
    },
  },
  photos: [
    { src: "/projects/alpha-01.png", alt: "Veicord Alpha P2P 与 Agent 网络控制中心" },
    { src: "/projects/alpha-02.png", alt: "Veicord Alpha 身份登录入口" },
    { src: "/projects/alpha-03.png", alt: "Veicord Alpha 运行设置" },
    { src: "/projects/alpha-04.png", alt: "VEIC Reader DBSCAN 可视化教程" },
    { src: "/projects/alpha-05.png", alt: "VEIC Console 设备概览" },
    { src: "/projects/alpha-06.png", alt: "VEIC Console 设备专属文档" },
    { src: "/projects/alpha-07.png", alt: "VEIC Console 临时码远程诊断授权" },
    { src: "/projects/alpha-08.png", alt: "VEIC Console SSH 连接对话框" },
  ],
  skills: [
    { name: "C++", icon: Code2 },
    { name: "ROS / ROS2", icon: Bot },
    { name: "Qt 上位机", icon: AppWindow },
    { name: "Linux", icon: Terminal },
    { name: "计算机网络", icon: Network },
    { name: "密码学", icon: ShieldCheck },
    { name: "存储与虚拟化", icon: HardDrive },
    { name: "C4 / PlantUML", icon: Workflow },
    { name: "Pandoc / Markdown", icon: FileText },
    { name: "AI 辅助工程", icon: BrainCircuit },
    { name: "PostgreSQL", icon: Database },
    { name: "容器与部署", icon: Boxes },
  ],
  navbar: [
    { href: "/", icon: House, label: "首页" },
    { href: "/#projects", icon: FolderKanban, label: "项目" },
    { href: "/#work", icon: BriefcaseBusiness, label: "经历" },
    { href: "/#photos", icon: Images, label: "界面" },
  ],
  contact: {
    email: "a993056494@163.com",
    tel: "",
    social: {
      GitHub: {
        name: "GitHub",
        url: "https://github.com/Shigure-moon",
        icon: Icons.github,
        navbar: true,
      },
      email: {
        name: "发送邮件",
        url: "mailto:a993056494@163.com",
        icon: Icons.email,
        navbar: true,
      },
    },
  },
  work: [
    {
      company: "幻尔科技",
      href: "https://www.hiwonder.com/",
      badges: ["机器人"],
      location: "成都",
      title: "ROS 技术支持工程师",
      logoUrl: "/logos/hiwonder.svg",
      start: "2026",
      end: undefined,
      description:
        "实习三个月后转正。面向机器人产品处理 Linux、ROS、网络、摄像头、模型部署和版本差异问题，并持续把排错经验转化为工具、文档与可复现流程。",
    },
  ],
  education: [
    {
      school: "成都东软学院",
      href: "https://www.nsu.edu.cn/",
      degree: "网络空间安全 · 本科",
      logoUrl: "/logos/nsu.png",
      start: "2022",
      end: "2026",
    },
  ],
  projects: [
    {
      title: "Veicord Alpha",
      href: "https://github.com/Shigure-moon",
      dates: "2026 - 至今",
      active: true,
      description:
        "面向具身智能、边缘计算与 DevSecOps 的设备连接和 Agent 运维协作平台。串联 **Alpha_soft** 桌面端与 **Alpha_server** 网络控制面，完成身份、Workspace、Bridge、路由审批、审计和 NetBird 适配，并使用 C4、PlantUML 与 Pandoc 维护架构交付。",
      technologies: ["Tauri 2", "Rust", "React", "TypeScript", "Axum", "PostgreSQL", "NetBird", "OpenAPI"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/Shigure-moon",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "/projects/alpha-01.png",
      video: "",
    },
    {
      title: "VEIC Console",
      href: "https://github.com/Shigure-moon",
      dates: "2026",
      active: true,
      description:
        "把设备状态、机型专属文档、临时验证码与授权 SSH 诊断放进同一条机器人技术支持工作流，降低工程师进入陌生设备环境的时间成本，并为日志采集与 AI 分析预留结构化入口。",
      technologies: ["React", "TypeScript", "SSH", "Device Telemetry", "Markdown", "Permission Workflow"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/Shigure-moon",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "/projects/alpha-05.png",
      video: "",
    },
    {
      title: "VEIC Reader",
      href: "https://github.com/Shigure-moon",
      dates: "2026",
      active: true,
      description:
        "离线优先的工程知识阅读器。通过 `.veic` manifest 将 Markdown、代码、图表、公式、媒体和交互内容封装为可分发知识包，并以 DBSCAN 教程验证视觉化技术文档体验。",
      technologies: ["Tauri 2", "Rust", "WebView2", "TypeScript", "Markdown", "Mermaid", "KaTeX", "Three.js"],
      links: [
        {
          type: "GitHub",
          href: "https://github.com/Shigure-moon",
          icon: <Icons.github className="size-3" />,
        },
      ],
      image: "/projects/alpha-04.png",
      video: "",
    },
  ],
  hackathons: [
    {
      title: "Hermes Log Intelligence MVP",
      dates: "2026",
      location: "日志智能 / 工程诊断",
      description: "将原始日志整理为 run package、机器指纹、只读采集计划和结构化诊断记忆，明确外部 Agent 与人工复核边界。",
      image: "",
      links: [] as TimelineLink[],
    },
    {
      title: "智慧药房 navigation_v2",
      dates: "2026",
      location: "ROS2 / 导航",
      description: "组合闭环 Pure Pursuit、任务区 Nav2、命令仲裁和 PyQt 路线编辑，形成可复现的仿真赛事流程。",
      image: "",
      links: [] as TimelineLink[],
    },
    {
      title: "IoT 智能门锁安全管控平台",
      dates: "2024",
      location: "毕业设计 / 物联网安全",
      description: "围绕设备身份、证书生命周期、MQTT/TLS 与固件烧录设计安全管理平台，并熟练使用 C4 架构图讲解系统边界。",
      image: "",
      links: [] as TimelineLink[],
    },
    {
      title: "RAICOM 双机器狗协同",
      dates: "2024",
      location: "机器人竞赛 / 视觉与通信",
      description: "负责视觉识别、Qt 上位机控制和双机通信，连接 YOLOv8-Pose、OpenCV、Socket 与运动控制任务。",
      image: "",
      links: [] as TimelineLink[],
    },
  ],
} as const;
