-- T004: Create whatsapp_bot_settings table in production database
-- This migration creates the whatsapp_bot_settings table that exists in the application code
-- but is missing from the production database (app2 on 93.127.142.144)

CREATE TABLE IF NOT EXISTS whatsapp_bot_settings (
    id SERIAL PRIMARY KEY,
    bot_name VARCHAR(100) NOT NULL DEFAULT 'مساعد إدارة المشاريع',
    bot_description VARCHAR(500) DEFAULT 'بوت ذكي لإدارة المشاريع والمصروفات',
    language VARCHAR(10) NOT NULL DEFAULT 'ar',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Riyadh',
    
    delete_previous_messages BOOLEAN NOT NULL DEFAULT false,
    bold_headings BOOLEAN NOT NULL DEFAULT true,
    use_emoji BOOLEAN NOT NULL DEFAULT true,
    welcome_message TEXT DEFAULT '',
    unavailable_message TEXT DEFAULT 'عذراً، الخدمة غير متاحة حالياً. حاول لاحقاً.',
    footer_text VARCHAR(200) DEFAULT '*0* القائمة | *#* رجوع',
    
    menu_main_title VARCHAR(100) DEFAULT 'القائمة الرئيسية',
    menu_expenses_title VARCHAR(100) DEFAULT 'المصروفات',
    menu_projects_title VARCHAR(100) DEFAULT 'المشاريع',
    menu_reports_title VARCHAR(100) DEFAULT 'التقارير',
    menu_export_title VARCHAR(100) DEFAULT 'تصدير الكشوفات',
    menu_help_title VARCHAR(100) DEFAULT 'المساعدة',
    menu_expenses_emoji VARCHAR(10) DEFAULT '💰',
    menu_projects_emoji VARCHAR(10) DEFAULT '🏗️',
    menu_reports_emoji VARCHAR(10) DEFAULT '📊',
    menu_export_emoji VARCHAR(10) DEFAULT '📤',
    menu_help_emoji VARCHAR(10) DEFAULT '❓',
    
    bot_enabled BOOLEAN NOT NULL DEFAULT true,
    maintenance_mode BOOLEAN NOT NULL DEFAULT false,
    maintenance_message TEXT DEFAULT '🔧 البوت في وضع الصيانة حالياً. سنعود قريباً.',
    
    business_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    business_hours_start VARCHAR(5) NOT NULL DEFAULT '08:00',
    business_hours_end VARCHAR(5) NOT NULL DEFAULT '17:00',
    business_days VARCHAR(50) NOT NULL DEFAULT '0,1,2,3,4',
    outside_hours_message TEXT DEFAULT '⏰ عذراً، ساعات العمل من {start} إلى {end}. سنرد عليك في أقرب وقت.',
    
    smart_greeting BOOLEAN NOT NULL DEFAULT true,
    goodbye_message TEXT DEFAULT '',
    waiting_message TEXT DEFAULT '⏳ جاري معالجة طلبك...',
    typing_indicator BOOLEAN NOT NULL DEFAULT true,
    
    session_timeout_minutes INTEGER NOT NULL DEFAULT 30,
    max_message_length INTEGER NOT NULL DEFAULT 4000,
    per_user_daily_limit INTEGER NOT NULL DEFAULT 100,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 10,
    max_retries INTEGER NOT NULL DEFAULT 3,
    
    admin_notify_phone VARCHAR(20) DEFAULT '',
    media_enabled BOOLEAN NOT NULL DEFAULT true,
    
    protection_level VARCHAR(20) NOT NULL DEFAULT 'balanced',
    response_delay_min INTEGER NOT NULL DEFAULT 2000,
    response_delay_max INTEGER NOT NULL DEFAULT 5000,
    daily_message_limit INTEGER NOT NULL DEFAULT 50,
    
    notify_new_message BOOLEAN NOT NULL DEFAULT false,
    notify_on_error BOOLEAN NOT NULL DEFAULT true,
    notify_on_disconnect BOOLEAN NOT NULL DEFAULT true,
    
    debug_mode BOOLEAN NOT NULL DEFAULT false,
    message_logging BOOLEAN NOT NULL DEFAULT true,
    auto_reconnect BOOLEAN NOT NULL DEFAULT true,
    
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255),
    
    CONSTRAINT whatsapp_bot_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create index for updated_by column if needed
CREATE INDEX IF NOT EXISTS idx_whatsapp_bot_settings_updated_by ON whatsapp_bot_settings(updated_by);

-- Insert default settings row if table was just created
INSERT INTO whatsapp_bot_settings (updated_at) VALUES (CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
