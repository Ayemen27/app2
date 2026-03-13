export interface BotReplyButton {
  id: string;
  title: string;
}

export interface ListRow {
  id: string;
  title: string;
  description?: string;
}

export interface ListSection {
  title: string;
  rows: ListRow[];
}

export interface BotReply {
  type: 'text' | 'buttons' | 'list';
  body: string;
  header?: string;
  footer?: string;
  buttons?: BotReplyButton[];
  listButtonText?: string;
  sections?: ListSection[];
}

export interface MenuNode {
  id: string;
  title: string;
  body: string;
  parentId?: string;
  options: { id: string; title: string; emoji: string }[];
}

const menuRegistry: Record<string, MenuNode> = {
  main: {
    id: 'main',
    title: 'القائمة الرئيسية',
    body: 'اختر رقم الخدمة المطلوبة:',
    options: [
      { id: 'menu_expenses', title: 'إدارة المصروفات', emoji: '💰' },
      { id: 'menu_projects', title: 'المشاريع', emoji: '🏗️' },
      { id: 'menu_reports', title: 'التقارير', emoji: '📊' },
      { id: 'menu_help', title: 'المساعدة', emoji: '❓' },
    ],
  },
  expenses: {
    id: 'expenses',
    title: 'إدارة المصروفات',
    body: 'اختر العملية المطلوبة:',
    parentId: 'main',
    options: [
      { id: 'expense_add', title: 'تسجيل مصروف جديد', emoji: '➕' },
      { id: 'expense_summary', title: 'ملخص المصروفات', emoji: '📋' },
      { id: 'nav_back', title: 'رجوع للقائمة الرئيسية', emoji: '🔙' },
    ],
  },
  projects: {
    id: 'projects',
    title: 'المشاريع',
    body: 'اختر ما تريد:',
    parentId: 'main',
    options: [
      { id: 'projects_list', title: 'عرض جميع المشاريع', emoji: '📂' },
      { id: 'projects_status', title: 'إحصائيات المشاريع', emoji: '📈' },
      { id: 'nav_back', title: 'رجوع للقائمة الرئيسية', emoji: '🔙' },
    ],
  },
  reports: {
    id: 'reports',
    title: 'التقارير',
    body: 'اختر نوع التقرير:',
    parentId: 'main',
    options: [
      { id: 'report_daily', title: 'تقرير يومي', emoji: '📅' },
      { id: 'report_project', title: 'تقرير مشروع', emoji: '🏢' },
      { id: 'report_ask', title: 'اسأل الذكاء الاصطناعي', emoji: '🤖' },
      { id: 'nav_back', title: 'رجوع للقائمة الرئيسية', emoji: '🔙' },
    ],
  },
  help: {
    id: 'help',
    title: 'المساعدة',
    body: 'كيف يمكنني مساعدتك؟',
    parentId: 'main',
    options: [
      { id: 'help_commands', title: 'الأوامر المتاحة', emoji: '📖' },
      { id: 'help_contact', title: 'تواصل مع الدعم', emoji: '📞' },
      { id: 'nav_back', title: 'رجوع للقائمة الرئيسية', emoji: '🔙' },
    ],
  },
};

const GLOBAL_COMMANDS: Record<string, string> = {
  'رجوع': 'nav_back',
  'الرئيسية': 'nav_home',
  'إلغاء': 'nav_cancel',
  'القائمة': 'nav_home',
  'قائمة': 'nav_home',
  'back': 'nav_back',
  'home': 'nav_home',
  'cancel': 'nav_cancel',
  'menu': 'nav_home',
  '0': 'nav_home',
  '#': 'nav_back',
};

export function getMenuNode(menuId: string): MenuNode | undefined {
  return menuRegistry[menuId];
}

export function buildNumberedMenu(node: MenuNode): string {
  const lines: string[] = [];
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📌 *${node.title}*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');
  lines.push(node.body);
  lines.push('');
  node.options.forEach((opt, i) => {
    lines.push(`  ${opt.emoji}  *${i + 1}.* ${opt.title}`);
  });
  lines.push('');
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💡 أرسل *رقم* الخدمة | *0* الرئيسية | *#* رجوع`);
  return lines.join('\n');
}

export function buildWelcomeReply(userName: string): BotReply {
  const mainNode = menuRegistry.main;
  const lines: string[] = [];
  lines.push(`╔═══════════════════╗`);
  lines.push(`   🏗️ *مساعد المشاريع الذكي*`);
  lines.push(`╚═══════════════════╝`);
  lines.push('');
  lines.push(`مرحباً بك *${userName}*! 👋`);
  lines.push(`أنا مساعدك الذكي لإدارة المشاريع.`);
  lines.push(`يمكنني مساعدتك في تسجيل المصروفات،`);
  lines.push(`متابعة المشاريع، والتقارير.`);
  lines.push('');
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📌 *الخدمات المتاحة*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push('');
  mainNode.options.forEach((opt, i) => {
    lines.push(`  ${opt.emoji}  *${i + 1}.* ${opt.title}`);
  });
  lines.push('');
  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`💡 أرسل *رقم* الخدمة للبدء`);
  lines.push(`💬 أو اكتب سؤالك مباشرة`);

  return { type: 'text', body: lines.join('\n') };
}

export function buildMenuReply(menuId: string): BotReply {
  const node = menuRegistry[menuId];
  if (!node) {
    return {
      type: 'text',
      body: '❌ القائمة غير موجودة.\nأرسل *0* للعودة للقائمة الرئيسية.',
    };
  }
  return { type: 'text', body: buildNumberedMenu(node) };
}

export interface ResolvedInput {
  action: 'navigate' | 'command' | 'menu_select' | 'unknown';
  targetMenuId?: string;
  commandId?: string;
  selectedOptionId?: string;
}

export function resolveUserInput(input: string, currentMenuId?: string): ResolvedInput {
  const trimmed = input.trim();

  const globalCmd = GLOBAL_COMMANDS[trimmed.toLowerCase()] || GLOBAL_COMMANDS[trimmed];

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
    return { action: 'command', commandId: 'cancel' };
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
      const menuMap: Record<string, string> = {
        'menu_expenses': 'expenses',
        'menu_projects': 'projects',
        'menu_reports': 'reports',
        'menu_help': 'help',
      };
      if (menuMap[selectedOption.id]) {
        return { action: 'navigate', targetMenuId: menuMap[selectedOption.id] };
      }
      return { action: 'menu_select', selectedOptionId: selectedOption.id };
    }
  }

  const directMenuMap: Record<string, string> = {
    'menu_expenses': 'expenses',
    'menu_projects': 'projects',
    'menu_reports': 'reports',
    'menu_help': 'help',
  };
  if (directMenuMap[trimmed]) {
    return { action: 'navigate', targetMenuId: directMenuMap[trimmed] };
  }

  const textMenuMap: Record<string, string> = {
    'مصروفات': 'expenses',
    'مصاريف': 'expenses',
    'مشاريع': 'projects',
    'مشاريعي': 'projects',
    'تقارير': 'reports',
    'مساعدة': 'help',
    'help': 'help',
  };
  if (textMenuMap[trimmed]) {
    return { action: 'navigate', targetMenuId: textMenuMap[trimmed] };
  }

  return { action: 'unknown', commandId: trimmed };
}
