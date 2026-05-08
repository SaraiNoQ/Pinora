// 默认分类
export const defaultCategories = ['Tools', 'Developer', 'AI', 'Entertainment', 'Academic', 'Literature', 'Social'];

// 分类图标映射
export const categoryIcons: Record<string, string> = {
  Tools: '🔧',
  Developer: '🛠️',
  AI: '💻',
  Entertainment: '🎮',
  Academic: '📚',
  Literature: '✒️',
  Social: '👥',
};

// 预设搜索引擎配置
export const searchEngines = [
  {
    id: 'google',
    name: 'Google',
    icon: '/icons/google.svg',
    searchUrl: 'https://www.google.com/search?q='
  },
  {
    id: 'baidu',
    name: 'Baidu',
    icon: '/icons/baidu.svg',
    searchUrl: 'https://www.baidu.com/s?wd='
  },
  {
    id: 'bilibili',
    name: '哔哩哔哩',
    icon: '/icons/bilibili.svg',
    searchUrl: 'https://search.bilibili.com/all?keyword='
  },
  {
    id: 'scholar',
    name: '谷歌学术',
    icon: '/icons/google-scholar.svg',
    searchUrl: 'https://scholar.google.com/scholar?q='
  },
  {
    id: 'google-translate',
    name: '谷歌翻译',
    icon: '/icons/google-translate.svg',
    searchUrl: 'https://translate.google.com/?sl=auto&tl=en&text='
  },
  {
    id: 'zhihu',
    name: '知乎',
    icon: '/icons/zhihu.svg',
    searchUrl: 'https://www.zhihu.com/search?type=content&q='
  },
  {
    id: 'xiaohongshu',
    name: '小红书',
    icon: '/icons/xiaohongshu.svg',
    searchUrl: 'https://www.xiaohongshu.com/search_result?keyword='
  }
];

// 预设书签数据
export const defaultBookmarks = [
  {
      "category": "Developer",
      "icon": "/icons/github.svg",
      "title": "GitHub",
      "url": "https://github.com",
      "id": "980a1586-1a62-41be-b94b-89fca19457eb"
  },
  {
      "category": "Developer",
      "icon": "/default8.svg",
      "title": "Cursor",
      "url": "https://www.cursor.com",
      "id": "794fd345-d90e-41f1-9739-c0c08723aff2"
  },
  {
      "category": "Developer",
      "icon": "/default0.svg",
      "title": "华为云",
      "url": "https://console.huaweicloud.com/console",
      "id": "aae45b6b-a3c8-4743-bdfd-afcde5a9298b"
  },
  {
      "category": "Developer",
      "icon": "/icons/cloudflare.svg",
      "title": "Cloudflare",
      "url": "https://dash.cloudflare.com",
      "id": "5e541098-d594-4c88-a43c-82440570c669"
  },
  {
      "category": "Developer",
      "icon": "/default8.svg",
      "title": "GitLab",
      "url": "https://gitlab.com/users/sign_in",
      "id": "1ebb5b81-9ff9-4af9-aae6-6195f5d48543"
  },
  {
      "category": "Developer",
      "icon": "/default4.svg",
      "title": "ClawCloud",
      "url": "https://claw.cloud/",
      "id": "9a5bb60d-c365-4dc9-b027-a3ea58d3b47b"
  },
  {
      "category": "Entertainment",
      "icon": "/icons/douyin.svg",
      "title": "DouYin",
      "url": "https://www.douyin.com",
      "id": "2902ab65-e7e7-4488-9da3-f27f0a0eb43d"
  },
  {
      "category": "Entertainment",
      "icon": "/default5.svg",
      "title": "哔哩哔哩 ",
      "url": "https://www.bilibili.com/",
      "id": "625f6946-5bd3-4850-9339-f53d0f21f954"
  },
  {
      "category": "Entertainment",
      "icon": "/icons/applemusic.svg",
      "title": "Apple Music",
      "url": "https://music.apple.com/cn/home",
      "id": "cd058ef7-3e39-495e-bb42-9927aeb46348"
  },
  {
      "category": "Entertainment",
      "icon": "/default6.svg",
      "title": "YouTube",
      "url": "https://www.youtube.com/",
      "id": "c7debb91-9f04-4bad-bdf7-3f48c6177f6c"
  },
  {
      "category": "AI",
      "icon": "/default2.svg",
      "title": "DeepSeek",
      "url": "https://chat.deepseek.com/",
      "id": "db133f31-e6fc-4e41-8f3f-d0978ebb153f"
  },
  {
      "category": "AI",
      "icon": "/default4.svg",
      "title": "SiliconCloud",
      "url": "https://cloud.siliconflow.cn/models",
      "id": "b722f1f6-1ae4-4c68-ac4e-ebeb0d76c2ba"
  },
  {
      "category": "AI",
      "icon": "/default5.svg",
      "title": "ChatGPT",
      "url": "https://chatgpt.com/",
      "id": "f10c45fe-a8f4-4989-b9ce-721732f1efb9"
  },
  {
      "category": "AI",
      "icon": "/default6.svg",
      "title": "OpenRouter",
      "url": "https://openrouter.ai/models",
      "id": "e64ac803-4646-4a36-ae21-76a913bab261"
  },
  {
      "category": "Tools",
      "icon": "/icons/iconfont.svg",
      "title": "iconfont",
      "url": "https://www.iconfont.cn",
      "id": "8b3443a0-03b8-47d4-957a-d4471f2ca620"
  },
  {
      "category": "Tools",
      "icon": "/default1.svg",
      "title": "文字效果工具",
      "url": "https://www.sioe.cn/yingyong/",
      "id": "8be2f1a7-3332-4bfa-98f6-5020e5cd06f8"
  },
  {
      "category": "Tools",
      "icon": "/default6.svg",
      "title": "色采 - 配色助手",
      "url": "https://colorcollect.cn/inspiration",
      "id": "6ea7eb93-ec52-4e40-b4fa-c8e8c0293562"
  },
  {
      "category": "Tools",
      "icon": "/default5.svg",
      "title": "CyberMania",
      "url": "https://www.cybermania.ws/",
      "id": "62efbc11-b6d0-4127-8174-15fce1e35906"
  },
  {
      "category": "Tools",
      "icon": "/default7.svg",
      "title": "汉典书法",
      "url": "https://sf.zdic.net/",
      "id": "aa24e695-9064-43db-81d8-529843d097a1"
  },
  {
      "category": "Tools",
      "icon": "/default1.svg",
      "title": "PDF24",
      "url": "https://tools.pdf24.org/zh/",
      "id": "a3cea29f-efc3-43a9-ae9d-0b17725e9db6"
  },
  {
      "category": "Tools",
      "icon": "/default9.svg",
      "title": "Latex在线编辑",
      "url": "http://www.latexai.com/",
      "id": "3ebdd08a-6ba9-4af6-8ee4-f44a4a448340"
  },
  {
      "category": "Tools",
      "icon": "/default4.svg",
      "id": "fc8b584e-b0a7-4439-b7a9-33deaff8053b",
      "title": "图片转 BASE64 编码",
      "url": "https://www.jyshare.com/front-end/59/"
  },
  {
      "category": "Social",
      "icon": "/default2.svg",
      "title": "Telegram",
      "url": "https://web.telegram.org/a/",
      "id": "b5cf8db5-d3f0-4e99-a093-1a113a8382e7"
  }
];