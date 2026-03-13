export interface BotReply {
  type: 'text';
  body: string;
}

export interface MenuOption {
  id: string;
  title: string;
  emoji: string;
}

export interface MenuNode {
  id: string;
  title: string;
  body: string;
  parentId?: string;
  options: MenuOption[];
}

interface BotSettingsForMenu {
  menuMainTitle?: string;
  menuExpensesTitle?: string;
  menuProjectsTitle?: string;
  menuReportsTitle?: string;
  menuExportTitle?: string;
  menuHelpTitle?: string;
  menuExpensesEmoji?: string;
  menuProjectsEmoji?: string;
  menuReportsEmoji?: string;
  menuExportEmoji?: string;
  menuHelpEmoji?: string;
  footerText?: string;
}

function getMenuRegistry(settings?: BotSettingsForMenu): Record<string, MenuNode> {
  const s = settings || {};
  return {
    main: {
      id: 'main',
      title: s.menuMainTitle || 'القائمة الرئيسية',
      body: '',
      options: [
        { id: 'menu_expenses', title: s.menuExpensesTitle || 'المصروفات', emoji: s.menuExpensesEmoji || '💰' },
        { id: 'menu_projects', title: s.menuProjectsTitle || 'المشاريع', emoji: s.menuProjectsEmoji || '🏗️' },
        { id: 'menu_reports', title: s.menuReportsTitle || 'التقارير', emoji: s.menuReportsEmoji || '📊' },
        { id: 'menu_help', title: s.menuHelpTitle || 'المساعدة', emoji: s.menuHelpEmoji || '❓' },
      ],
    },
    expenses: {
      id: 'expenses',
      title: s.menuExpensesTitle || 'المصروفات',
      body: '',
      parentId: 'main',
      options: [
        { id: 'expense_add', title: 'تسجيل مصروف', emoji: '➕' },
        { id: 'expense_summary', title: 'ملخص المصروفات', emoji: '📋' },
        { id: 'nav_back', title: 'رجوع', emoji: '🔙' },
      ],
    },
    projects: {
      id: 'projects',
      title: s.menuProjectsTitle || 'المشاريع',
      body: '',
      parentId: 'main',
      options: [
        { id: 'projects_list', title: 'عرض المشاريع', emoji: '📂' },
        { id: 'projects_status', title: 'الإحصائيات', emoji: '📈' },
        { id: 'nav_back', title: 'رجوع', emoji: '🔙' },
      ],
    },
    reports: {
      id: 'reports',
      title: s.menuReportsTitle || 'التقارير',
      body: '',
      parentId: 'main',
      options: [
        { id: 'report_daily', title: 'تقرير يومي', emoji: '📅' },
        { id: 'report_project', title: 'تقرير مشروع', emoji: '🏢' },
        { id: 'menu_export', title: 'تصدير كشوفات', emoji: s.menuExportEmoji || '📤' },
        { id: 'report_ask', title: 'اسأل الذكاء الاصطناعي', emoji: '🤖' },
        { id: 'nav_back', title: 'رجوع', emoji: '🔙' },
      ],
    },
    export_reports: {
      id: 'export_reports',
      title: s.menuExportTitle || 'تصدير الكشوفات',
      body: '',
      parentId: 'reports',
      options: [
        { id: 'export_daily', title: 'كشف يومي شامل', emoji: '📋' },
        { id: 'export_worker', title: 'كشف حساب عامل', emoji: '👷' },
        { id: 'export_period', title: 'تقرير فترة ختامي', emoji: '📊' },
        { id: 'export_daily_range', title: 'كشف يومي لفترة', emoji: '📅' },
        { id: 'export_multi_project', title: 'تقرير متعدد المشاريع', emoji: '🏗️' },
        { id: 'nav_back', title: 'رجوع', emoji: '🔙' },
      ],
    },
    help: {
      id: 'help',
      title: s.menuHelpTitle || 'المساعدة',
      body: '',
      parentId: 'main',
      options: [
        { id: 'help_commands', title: 'الأوامر المتاحة', emoji: '📖' },
        { id: 'help_contact', title: 'تواصل مع الدعم', emoji: '📞' },
        { id: 'nav_back', title: 'رجوع', emoji: '🔙' },
      ],
    },
  };
}

const menuRegistry = getMenuRegistry();

const NAV_HINT = `*0* القائمة | *#* رجوع`;

function getFooterText(settings?: BotSettingsForMenu): string {
  return settings?.footerText || NAV_HINT;
}

export function getMenuNode(menuId: string, settings?: BotSettingsForMenu): MenuNode | undefined {
  const registry = settings ? getMenuRegistry(settings) : menuRegistry;
  return registry[menuId];
}

function formatMenuOptions(options: MenuOption[]): string {
  return options.map((opt, i) => `${opt.emoji} *${i + 1}.* ${opt.title}`).join('\n');
}

export function buildWelcomeReply(userName: string, settings?: BotSettingsForMenu): BotReply {
  const registry = settings ? getMenuRegistry(settings) : menuRegistry;
  const mainNode = registry.main;
  const footer = getFooterText(settings);
  const lines: string[] = [
    `🏗️ *مساعد إدارة المشاريع*`,
    `أهلاً *${userName}*! اختر خدمة:`,
    ``,
    formatMenuOptions(mainNode.options),
    ``,
    `💡 أرسل *رقم* الخدمة أو اكتب سؤالك`,
  ];
  return { type: 'text', body: lines.join('\n') };
}

export function buildMenuReply(menuId: string, settings?: BotSettingsForMenu): BotReply {
  const registry = settings ? getMenuRegistry(settings) : menuRegistry;
  const node = registry[menuId];
  if (!node) {
    return { type: 'text', body: '❌ القائمة غير موجودة. أرسل *0* للرئيسية.' };
  }
  const footer = getFooterText(settings);
  const lines: string[] = [
    `📌 *${node.title}*`,
    ``,
    formatMenuOptions(node.options),
    ``,
    footer,
  ];
  return { type: 'text', body: lines.join('\n') };
}

export function buildTextWithMenu(header: string, body: string, menuId?: string, settings?: BotSettingsForMenu): BotReply {
  const registry = settings ? getMenuRegistry(settings) : menuRegistry;
  const footer = getFooterText(settings);
  const lines: string[] = [body];
  if (menuId) {
    const node = registry[menuId];
    if (node) {
      lines.push(``);
      lines.push(`📌 *${node.title}*`);
      lines.push(formatMenuOptions(node.options));
    }
  }
  lines.push(``);
  lines.push(footer);
  return { type: 'text', body: lines.join('\n') };
}

export function buildQuickOptions(header: string, body: string, options: { emoji: string; title: string }[], settings?: BotSettingsForMenu): BotReply {
  const footer = getFooterText(settings);
  const lines: string[] = [
    `📌 *${header}*`,
    body,
    ``,
  ];
  options.forEach((opt, i) => {
    lines.push(`${opt.emoji} *${i + 1}.* ${opt.title}`);
  });
  lines.push(``);
  lines.push(footer);
  return { type: 'text', body: lines.join('\n') };
}

export interface ResolvedInput {
  action: 'navigate' | 'cancel' | 'menu_select' | 'free_text';
  targetMenuId?: string;
  selectedOptionId?: string;
  originalText?: string;
}

const GLOBAL_COMMANDS: Record<string, string> = {
  'رجوع': 'nav_back',
  'الرئيسية': 'nav_home',
  'إلغاء': 'nav_cancel',
  'الغاء': 'nav_cancel',
  'القائمة': 'nav_home',
  'قائمة': 'nav_home',
  'back': 'nav_back',
  'home': 'nav_home',
  'cancel': 'nav_cancel',
  'menu': 'nav_home',
  '0': 'nav_home',
  '#': 'nav_back',
};

const TEXT_MENU_MAP: Record<string, string> = {
  'مصروفات': 'expenses',
  'مصاريف': 'expenses',
  'مشاريع': 'projects',
  'مشاريعي': 'projects',
  'تقارير': 'reports',
  'تقرير': 'reports',
  'مساعدة': 'help',
  'مساعده': 'help',
  'help': 'help',
  'خدمات': 'main',
  'الخدمات': 'main',
  'تصدير': 'export_reports',
  'كشوفات': 'export_reports',
  'كشف': 'export_reports',
  'اكسل': 'export_reports',
  'excel': 'export_reports',
  'pdf': 'export_reports',
};

const DIRECT_OPTION_MAP: Record<string, string> = {
  'menu_expenses': 'expenses',
  'menu_projects': 'projects',
  'menu_reports': 'reports',
  'menu_export': 'export_reports',
  'menu_help': 'help',
};

export function resolveUserInput(input: string, currentMenuId?: string): ResolvedInput {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const globalCmd = GLOBAL_COMMANDS[lower] || GLOBAL_COMMANDS[trimmed];

  if (globalCmd === 'nav_back') {
    if (currentMenuId) {
      const currentNode = menuRegistry[currentMenuId];
      if (currentNode?.parentId) {
        return { action: 'navigate', targetMenuId: currentNode.parentId };
      }
    }
    return { action: 'navigate', targetMenuId: 'main' };
  }

  if (globalCmd === 'nav_home') {
    return { action: 'navigate', targetMenuId: 'main' };
  }

  if (globalCmd === 'nav_cancel') {
    return { action: 'cancel' };
  }

  const numMatch = trimmed.match(/^(\d+)$/);
  if (numMatch && currentMenuId) {
    const idx = parseInt(numMatch[1]) - 1;
    const currentNode = menuRegistry[currentMenuId];
    if (currentNode && idx >= 0 && idx < currentNode.options.length) {
      const selectedOption = currentNode.options[idx];
      if (selectedOption.id === 'nav_back') {
        return { action: 'navigate', targetMenuId: currentNode.parentId || 'main' };
      }
      if (DIRECT_OPTION_MAP[selectedOption.id]) {
        return { action: 'navigate', targetMenuId: DIRECT_OPTION_MAP[selectedOption.id] };
      }
      return { action: 'menu_select', selectedOptionId: selectedOption.id };
    }
  }

  if (DIRECT_OPTION_MAP[trimmed]) {
    return { action: 'navigate', targetMenuId: DIRECT_OPTION_MAP[trimmed] };
  }

  if (TEXT_MENU_MAP[lower]) {
    return { action: 'navigate', targetMenuId: TEXT_MENU_MAP[lower] };
  }

  return { action: 'free_text', originalText: trimmed };
}
