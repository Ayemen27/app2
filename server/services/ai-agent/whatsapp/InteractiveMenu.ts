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
  options: BotReplyButton[] | ListSection[];
  replyType: 'buttons' | 'list';
}

const menuRegistry: Record<string, MenuNode> = {
  main: {
    id: 'main',
    title: 'القائمة الرئيسية',
    body: 'اختر من القائمة:',
    replyType: 'buttons',
    options: [
      { id: 'menu_expenses', title: 'إضافة مصروف' },
      { id: 'menu_projects', title: 'مشاريعي' },
      { id: 'menu_reports', title: 'تقارير سريعة' },
    ] as BotReplyButton[],
  },
  expenses: {
    id: 'expenses',
    title: 'المصروفات',
    body: 'اختر نوع العملية:',
    parentId: 'main',
    replyType: 'buttons',
    options: [
      { id: 'expense_add', title: 'تسجيل مصروف جديد' },
      { id: 'expense_summary', title: 'ملخص المصروفات' },
      { id: 'nav_back', title: 'رجوع' },
    ] as BotReplyButton[],
  },
  projects: {
    id: 'projects',
    title: 'المشاريع',
    body: 'اختر ما تريد:',
    parentId: 'main',
    replyType: 'buttons',
    options: [
      { id: 'projects_list', title: 'عرض المشاريع' },
      { id: 'projects_status', title: 'حالة المشاريع' },
      { id: 'nav_back', title: 'رجوع' },
    ] as BotReplyButton[],
  },
  reports: {
    id: 'reports',
    title: 'التقارير',
    body: 'اختر نوع التقرير:',
    parentId: 'main',
    replyType: 'buttons',
    options: [
      { id: 'report_daily', title: 'تقرير يومي' },
      { id: 'report_project', title: 'تقرير مشروع' },
      { id: 'nav_back', title: 'رجوع' },
    ] as BotReplyButton[],
  },
  help: {
    id: 'help',
    title: 'المساعدة',
    body: 'كيف يمكنني مساعدتك؟',
    parentId: 'main',
    replyType: 'buttons',
    options: [
      { id: 'help_commands', title: 'الأوامر المتاحة' },
      { id: 'help_contact', title: 'تواصل مع الدعم' },
      { id: 'nav_back', title: 'رجوع' },
    ] as BotReplyButton[],
  },
};

const GLOBAL_COMMANDS: Record<string, string> = {
  'رجوع': 'nav_back',
  'الرئيسية': 'nav_home',
  'إلغاء': 'nav_cancel',
  'القائمة': 'nav_home',
  'back': 'nav_back',
  'home': 'nav_home',
  'cancel': 'nav_cancel',
  'menu': 'nav_home',
};

export function getMenuNode(menuId: string): MenuNode | undefined {
  return menuRegistry[menuId];
}

export function buildWelcomeReply(userName: string): BotReply {
  return {
    type: 'buttons',
    header: 'مرحبا بك!',
    body: `أهلاً ${userName}! أنا مساعدك الذكي.\nكيف يمكنني مساعدتك اليوم؟`,
    footer: 'اختر من الأزرار أدناه أو اكتب سؤالك',
    buttons: [
      { id: 'menu_expenses', title: 'إضافة مصروف' },
      { id: 'menu_projects', title: 'مشاريعي' },
      { id: 'menu_help', title: 'مساعدة' },
    ],
  };
}

export function buildMenuReply(menuId: string, _context?: Record<string, any>): BotReply {
  const node = menuRegistry[menuId];
  if (!node) {
    return {
      type: 'text',
      body: 'القائمة غير موجودة. أرسل "الرئيسية" للعودة.',
    };
  }

  if (node.replyType === 'list') {
    return {
      type: 'list',
      header: node.title,
      body: node.body,
      footer: 'اختر من القائمة',
      listButtonText: 'عرض الخيارات',
      sections: node.options as ListSection[],
    };
  }

  return {
    type: 'buttons',
    header: node.title,
    body: node.body,
    footer: 'اختر من الأزرار أدناه',
    buttons: (node.options as BotReplyButton[]).slice(0, 3),
  };
}

export interface ResolvedInput {
  action: 'navigate' | 'command' | 'unknown';
  targetMenuId?: string;
  commandId?: string;
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

  const menuMap: Record<string, string> = {
    'menu_expenses': 'expenses',
    'menu_projects': 'projects',
    'menu_reports': 'reports',
    'menu_help': 'help',
  };

  if (menuMap[trimmed]) {
    return { action: 'navigate', targetMenuId: menuMap[trimmed] };
  }

  if (menuRegistry[trimmed]) {
    return { action: 'navigate', targetMenuId: trimmed };
  }

  return { action: 'command', commandId: trimmed };
}
