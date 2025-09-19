
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function createAllTablesComplete() {
  console.log('🚀 إنشاء جميع الجداول الـ47 مباشرة...');
  
  try {
    // 1. جدول المستخدمين
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        role TEXT DEFAULT 'admin' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 1. تم إنشاء جدول users');

    // 2. جدول المشاريع
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 2. تم إنشاء جدول projects');

    // 3. جدول العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS workers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        daily_wage NUMERIC(10, 2) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 3. تم إنشاء جدول workers');

    // 4. جدول تحويلات العهدة
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS fund_transfers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        amount NUMERIC(10, 2) NOT NULL,
        sender_name TEXT,
        transfer_number TEXT UNIQUE,
        transfer_type TEXT NOT NULL,
        transfer_date TIMESTAMP NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 4. تم إنشاء جدول fund_transfers');

    // 5. جدول حضور العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS worker_attendance (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        worker_id VARCHAR NOT NULL REFERENCES workers(id),
        date TEXT NOT NULL,
        start_time TEXT,
        end_time TEXT,
        work_description TEXT,
        is_present BOOLEAN NOT NULL,
        work_days NUMERIC(3, 2) DEFAULT '1.00' NOT NULL,
        daily_wage NUMERIC(10, 2) NOT NULL,
        actual_wage NUMERIC(10, 2) NOT NULL,
        paid_amount NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        remaining_amount NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        payment_type TEXT DEFAULT 'partial' NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 5. تم إنشاء جدول worker_attendance');

    // 6. جدول الموردين
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        contact_person TEXT,
        phone TEXT,
        address TEXT,
        payment_terms TEXT DEFAULT 'نقد',
        total_debt NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 6. تم إنشاء جدول suppliers');

    // 7. جدول المواد
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS materials (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        unit TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 7. تم إنشاء جدول materials');

    // 8. جدول شراء المواد
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS material_purchases (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        supplier_id VARCHAR REFERENCES suppliers(id),
        material_id VARCHAR NOT NULL REFERENCES materials(id),
        quantity NUMERIC(10, 3) NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        purchase_type TEXT DEFAULT 'نقد' NOT NULL,
        paid_amount NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        remaining_amount NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        supplier_name TEXT,
        invoice_number TEXT,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        invoice_photo TEXT,
        notes TEXT,
        purchase_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 8. تم إنشاء جدول material_purchases');

    // 9. جدول مدفوعات الموردين
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS supplier_payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id VARCHAR NOT NULL REFERENCES suppliers(id),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        purchase_id VARCHAR REFERENCES material_purchases(id),
        amount NUMERIC(10, 2) NOT NULL,
        payment_method TEXT DEFAULT 'نقد' NOT NULL,
        payment_date TEXT NOT NULL,
        reference_number TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 9. تم إنشاء جدول supplier_payments');

    // 10. جدول مصروفات المواصلات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transportation_expenses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        worker_id VARCHAR REFERENCES workers(id),
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 10. تم إنشاء جدول transportation_expenses');

    // 11. جدول حوالات العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS worker_transfers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id VARCHAR NOT NULL REFERENCES workers(id),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        amount NUMERIC(10, 2) NOT NULL,
        transfer_number TEXT,
        sender_name TEXT,
        recipient_name TEXT NOT NULL,
        recipient_phone TEXT,
        transfer_method TEXT NOT NULL,
        transfer_date TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 11. تم إنشاء جدول worker_transfers');

    // 12. جدول أرصدة العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS worker_balances (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        worker_id VARCHAR NOT NULL REFERENCES workers(id),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        total_earned NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_paid NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_transferred NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        current_balance NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        last_updated TIMESTAMP DEFAULT now() NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 12. تم إنشاء جدول worker_balances');

    // 13. جدول ملخص المصروفات اليومية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS daily_expense_summaries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        date TEXT NOT NULL,
        carried_forward_amount NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_fund_transfers NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_worker_wages NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_material_costs NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_transportation_costs NUMERIC(10, 2) DEFAULT '0' NOT NULL,
        total_income NUMERIC(10, 2) NOT NULL,
        total_expenses NUMERIC(10, 2) NOT NULL,
        remaining_balance NUMERIC(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 13. تم إنشاء جدول daily_expense_summaries');

    // 14. جدول أنواع العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS worker_types (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        usage_count INTEGER DEFAULT 1 NOT NULL,
        last_used TIMESTAMP DEFAULT now() NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 14. تم إنشاء جدول worker_types');

    // 15. جدول الإكمال التلقائي
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS autocomplete_data (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        category TEXT NOT NULL,
        value TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1 NOT NULL,
        last_used TIMESTAMP DEFAULT now() NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 15. تم إنشاء جدول autocomplete_data');

    // 16. جدول نثريات العمال
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS worker_misc_expenses (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id VARCHAR NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 16. تم إنشاء جدول worker_misc_expenses');

    // 17. جدول إعدادات الطباعة
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS print_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        report_type TEXT DEFAULT 'worker_statement' NOT NULL,
        name TEXT NOT NULL,
        page_size TEXT DEFAULT 'A4' NOT NULL,
        page_orientation TEXT DEFAULT 'portrait' NOT NULL,
        margin_top NUMERIC(5, 2) DEFAULT '15.00' NOT NULL,
        margin_bottom NUMERIC(5, 2) DEFAULT '15.00' NOT NULL,
        margin_left NUMERIC(5, 2) DEFAULT '15.00' NOT NULL,
        margin_right NUMERIC(5, 2) DEFAULT '15.00' NOT NULL,
        font_family TEXT DEFAULT 'Arial' NOT NULL,
        font_size INTEGER DEFAULT 12 NOT NULL,
        header_font_size INTEGER DEFAULT 16 NOT NULL,
        table_font_size INTEGER DEFAULT 10 NOT NULL,
        header_background_color TEXT DEFAULT '#1e40af' NOT NULL,
        header_text_color TEXT DEFAULT '#ffffff' NOT NULL,
        table_header_color TEXT DEFAULT '#1e40af' NOT NULL,
        table_row_even_color TEXT DEFAULT '#ffffff' NOT NULL,
        table_row_odd_color TEXT DEFAULT '#f9fafb' NOT NULL,
        table_border_color TEXT DEFAULT '#000000' NOT NULL,
        table_border_width INTEGER DEFAULT 1 NOT NULL,
        table_cell_padding INTEGER DEFAULT 3 NOT NULL,
        table_column_widths TEXT DEFAULT '[8,12,10,30,12,15,15,12]' NOT NULL,
        show_header BOOLEAN DEFAULT true NOT NULL,
        show_logo BOOLEAN DEFAULT true NOT NULL,
        show_project_info BOOLEAN DEFAULT true NOT NULL,
        show_worker_info BOOLEAN DEFAULT true NOT NULL,
        show_attendance_table BOOLEAN DEFAULT true NOT NULL,
        show_transfers_table BOOLEAN DEFAULT true NOT NULL,
        show_summary BOOLEAN DEFAULT true NOT NULL,
        show_signatures BOOLEAN DEFAULT true NOT NULL,
        is_default BOOLEAN DEFAULT false NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        user_id TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 17. تم إنشاء جدول print_settings');

    // 18. جدول ترحيل الأموال بين المشاريع
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS project_fund_transfers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        from_project_id VARCHAR NOT NULL REFERENCES projects(id),
        to_project_id VARCHAR NOT NULL REFERENCES projects(id),
        amount NUMERIC(10, 2) NOT NULL,
        description TEXT,
        transfer_reason TEXT,
        transfer_date TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 18. تم إنشاء جدول project_fund_transfers');

    // 19. جدول قوالب التقارير
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS report_templates (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
        template_name TEXT DEFAULT 'default' NOT NULL,
        header_title TEXT DEFAULT 'نظام إدارة مشاريع البناء' NOT NULL,
        header_subtitle TEXT DEFAULT 'تقرير مالي',
        company_name TEXT DEFAULT 'شركة البناء والتطوير' NOT NULL,
        company_address TEXT DEFAULT 'صنعاء - اليمن',
        company_phone TEXT DEFAULT '+967 1 234567',
        company_email TEXT DEFAULT 'info@company.com',
        footer_text TEXT DEFAULT 'تم إنشاء هذا التقرير بواسطة نظام إدارة المشاريع',
        footer_contact TEXT DEFAULT 'للاستفسار: info@company.com | +967 1 234567',
        primary_color TEXT DEFAULT '#1f2937' NOT NULL,
        secondary_color TEXT DEFAULT '#3b82f6' NOT NULL,
        accent_color TEXT DEFAULT '#10b981' NOT NULL,
        text_color TEXT DEFAULT '#1f2937' NOT NULL,
        background_color TEXT DEFAULT '#ffffff' NOT NULL,
        font_size INTEGER DEFAULT 11 NOT NULL,
        font_family TEXT DEFAULT 'Arial' NOT NULL,
        logo_url TEXT,
        page_orientation TEXT DEFAULT 'portrait' NOT NULL,
        page_size TEXT DEFAULT 'A4' NOT NULL,
        margins JSONB DEFAULT '{"top":1,"bottom":1,"left":0.75,"right":0.75}'::jsonb,
        show_header BOOLEAN DEFAULT true NOT NULL,
        show_footer BOOLEAN DEFAULT true NOT NULL,
        show_logo BOOLEAN DEFAULT true NOT NULL,
        show_date BOOLEAN DEFAULT true NOT NULL,
        show_page_numbers BOOLEAN DEFAULT true NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      )
    `);
    console.log('✅ 19. تم إنشاء جدول report_templates');

    // 20. جدول تصنيفات الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_categories (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        icon TEXT,
        color TEXT DEFAULT '#3b82f6',
        parent_id VARCHAR REFERENCES tool_categories(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 20. تم إنشاء جدول tool_categories');

    // 21. جدول الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tools (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        sku TEXT UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        category_id VARCHAR REFERENCES tool_categories(id),
        project_id VARCHAR REFERENCES projects(id),
        unit TEXT DEFAULT 'قطعة' NOT NULL,
        is_tool BOOLEAN DEFAULT true NOT NULL,
        is_consumable BOOLEAN DEFAULT false NOT NULL,
        is_serial BOOLEAN DEFAULT false NOT NULL,
        purchase_price NUMERIC(12, 2),
        current_value NUMERIC(12, 2),
        depreciation_rate NUMERIC(5, 2),
        purchase_date DATE,
        supplier_id VARCHAR REFERENCES suppliers(id),
        warranty_expiry DATE,
        maintenance_interval INTEGER,
        last_maintenance_date DATE,
        next_maintenance_date DATE,
        status TEXT DEFAULT 'available' NOT NULL,
        condition TEXT DEFAULT 'excellent' NOT NULL,
        location_type TEXT,
        location_id TEXT,
        serial_number TEXT,
        barcode TEXT,
        qr_code TEXT,
        image_urls TEXT[],
        notes TEXT,
        specifications JSONB,
        total_usage_hours NUMERIC(10, 2) DEFAULT '0',
        usage_count INTEGER DEFAULT 0,
        ai_rating NUMERIC(3, 2),
        ai_notes TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 21. تم إنشاء جدول tools');

    // 22. جدول مخزون الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_stock (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        location_type TEXT NOT NULL,
        location_id VARCHAR,
        location_name TEXT,
        quantity INTEGER DEFAULT 0 NOT NULL,
        available_quantity INTEGER DEFAULT 0 NOT NULL,
        reserved_quantity INTEGER DEFAULT 0 NOT NULL,
        notes TEXT,
        last_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL,
        UNIQUE (tool_id, location_type, location_id)
      )
    `);
    console.log('✅ 22. تم إنشاء جدول tool_stock');

    // 23. جدول حركات الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_movements (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        from_type TEXT,
        from_id VARCHAR,
        to_type TEXT,
        to_id VARCHAR,
        project_id VARCHAR REFERENCES projects(id),
        reason TEXT,
        notes TEXT,
        reference_number TEXT,
        performed_by TEXT NOT NULL,
        performed_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 23. تم إنشاء جدول tool_movements');

    // 24. جدول سجل صيانة الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_maintenance_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        maintenance_type TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        work_performed TEXT,
        scheduled_date TIMESTAMP,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        next_due_date TIMESTAMP,
        status TEXT DEFAULT 'scheduled' NOT NULL,
        labor_cost NUMERIC(12, 2) DEFAULT '0',
        parts_cost NUMERIC(12, 2) DEFAULT '0',
        total_cost NUMERIC(12, 2) DEFAULT '0',
        performed_by VARCHAR REFERENCES users(id),
        assigned_to VARCHAR REFERENCES users(id),
        condition_before TEXT,
        condition_after TEXT,
        image_urls TEXT[],
        document_urls TEXT[],
        notes TEXT,
        issues TEXT,
        recommendations TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 24. تم إنشاء جدول tool_maintenance_logs');

    // 25. جدول تحليلات استخدام الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_usage_analytics (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        project_id VARCHAR REFERENCES projects(id),
        analysis_date TEXT NOT NULL,
        analysis_week TEXT,
        analysis_month TEXT,
        usage_hours NUMERIC(10, 2) DEFAULT '0',
        transfer_count INTEGER DEFAULT 0,
        maintenance_count INTEGER DEFAULT 0,
        operational_cost NUMERIC(12, 2) DEFAULT '0',
        maintenance_cost NUMERIC(12, 2) DEFAULT '0',
        utilization_rate NUMERIC(5, 2),
        efficiency_score NUMERIC(5, 2),
        predicted_usage NUMERIC(10, 2),
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 25. تم إنشاء جدول tool_usage_analytics');

    // 26. جدول عناصر شراء الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_purchase_items (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        material_purchase_id VARCHAR NOT NULL REFERENCES material_purchases(id) ON DELETE CASCADE,
        item_name TEXT NOT NULL,
        item_description TEXT,
        quantity INTEGER DEFAULT 1 NOT NULL,
        unit_price NUMERIC(12, 2) NOT NULL,
        total_price NUMERIC(12, 2) NOT NULL,
        is_tool_item BOOLEAN DEFAULT false NOT NULL,
        suggested_category_id VARCHAR REFERENCES tool_categories(id),
        conversion_status TEXT DEFAULT 'pending' NOT NULL,
        tool_id VARCHAR REFERENCES tools(id),
        ai_confidence NUMERIC(5, 2),
        ai_suggestions JSONB,
        notes TEXT,
        converted_at TIMESTAMP,
        converted_by VARCHAR REFERENCES users(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 26. تم إنشاء جدول tool_purchase_items');

    // 27. جدول جداول الصيانة المتقدمة
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        schedule_type TEXT NOT NULL,
        interval_days INTEGER,
        interval_weeks INTEGER,
        interval_months INTEGER,
        usage_hours_interval NUMERIC(10, 2),
        usage_count_interval INTEGER,
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_maintenance_date TIMESTAMP,
        next_due_date TIMESTAMP NOT NULL,
        maintenance_type TEXT DEFAULT 'preventive' NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        estimated_duration INTEGER,
        estimated_cost NUMERIC(12, 2),
        assigned_to VARCHAR REFERENCES users(id),
        created_by VARCHAR REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT,
        checklist_items JSONB,
        enable_notifications BOOLEAN DEFAULT true NOT NULL,
        notify_days_before INTEGER DEFAULT 3 NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 27. تم إنشاء جدول maintenance_schedules');

    // 28. جدول مهام الصيانة التفصيلية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        schedule_id VARCHAR NOT NULL REFERENCES maintenance_schedules(id) ON DELETE CASCADE,
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        task_name TEXT NOT NULL,
        task_description TEXT,
        task_type TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        due_date TIMESTAMP NOT NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        estimated_duration INTEGER,
        actual_duration INTEGER,
        estimated_cost NUMERIC(12, 2),
        actual_cost NUMERIC(12, 2),
        assigned_to VARCHAR REFERENCES users(id),
        performed_by VARCHAR REFERENCES users(id),
        result TEXT,
        findings TEXT,
        actions_taken TEXT,
        recommendations TEXT,
        before_images TEXT[],
        after_images TEXT[],
        document_urls TEXT[],
        materials_used JSONB,
        performer_signature TEXT,
        supervisor_signature TEXT,
        approved_by VARCHAR REFERENCES users(id),
        approved_at TIMESTAMP,
        notes TEXT,
        internal_notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 28. تم إنشاء جدول maintenance_tasks');

    // 29. جدول تتبع التكاليف للأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_cost_tracking (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        cost_type TEXT NOT NULL,
        cost_category TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency TEXT DEFAULT 'YER' NOT NULL,
        cost_date TEXT NOT NULL,
        cost_period TEXT,
        reference_type TEXT,
        reference_id VARCHAR,
        description TEXT NOT NULL,
        notes TEXT,
        approved_by VARCHAR REFERENCES users(id),
        approved_at TIMESTAMP,
        project_id VARCHAR REFERENCES projects(id),
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 29. تم إنشاء جدول tool_cost_tracking');

    // 30. جدول حجوزات الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_reservations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_id VARCHAR NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
        project_id VARCHAR NOT NULL REFERENCES projects(id),
        quantity INTEGER NOT NULL,
        reserved_by VARCHAR NOT NULL REFERENCES users(id),
        reservation_date TIMESTAMP DEFAULT now() NOT NULL,
        requested_date TIMESTAMP NOT NULL,
        expiry_date TIMESTAMP,
        status TEXT DEFAULT 'pending' NOT NULL,
        priority TEXT DEFAULT 'normal' NOT NULL,
        reason TEXT,
        notes TEXT,
        approved_by VARCHAR REFERENCES users(id),
        approved_at TIMESTAMP,
        fulfilled_by VARCHAR REFERENCES users(id),
        fulfilled_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 30. تم إنشاء جدول tool_reservations');

    // 31. جدول إشعارات النظام الاحترافي
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium' NOT NULL,
        severity TEXT DEFAULT 'info' NOT NULL,
        status TEXT DEFAULT 'active' NOT NULL,
        source_type TEXT,
        source_id VARCHAR,
        source_name TEXT,
        user_id VARCHAR REFERENCES users(id),
        target_audience TEXT DEFAULT 'all',
        action_required BOOLEAN DEFAULT false NOT NULL,
        action_url TEXT,
        action_label TEXT,
        scheduled_for TIMESTAMP,
        expires_at TIMESTAMP,
        read_at TIMESTAMP,
        dismissed_at TIMESTAMP,
        metadata JSONB,
        attachments TEXT[],
        view_count INTEGER DEFAULT 0 NOT NULL,
        click_count INTEGER DEFAULT 0 NOT NULL,
        last_viewed_at TIMESTAMP,
        is_system BOOLEAN DEFAULT false NOT NULL,
        is_auto_generated BOOLEAN DEFAULT true NOT NULL,
        is_persistent BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 31. تم إنشاء جدول system_notifications');

    // 32. جدول حالات قراءة الإشعارات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notification_read_states (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        notification_id TEXT NOT NULL,
        user_id VARCHAR REFERENCES users(id),
        is_read BOOLEAN DEFAULT true NOT NULL,
        read_at TIMESTAMP DEFAULT now() NOT NULL,
        device_info TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        UNIQUE (notification_id, user_id)
      )
    `);
    console.log('✅ 32. تم إنشاء جدول notification_read_states');

    // 33. جدول إشعارات الأدوات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tool_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        tool_id VARCHAR REFERENCES tools(id),
        tool_name TEXT,
        priority TEXT DEFAULT 'medium' NOT NULL,
        is_read BOOLEAN DEFAULT false NOT NULL,
        action_required BOOLEAN DEFAULT false NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        read_at TIMESTAMP
      )
    `);
    console.log('✅ 33. تم إنشاء جدول tool_notifications');

    // 34. جدول الموافقات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS approvals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        object_type TEXT NOT NULL,
        object_id VARCHAR NOT NULL,
        requested_by VARCHAR NOT NULL REFERENCES users(id),
        approver_id VARCHAR REFERENCES users(id),
        current_level INTEGER DEFAULT 1 NOT NULL,
        total_levels INTEGER DEFAULT 1 NOT NULL,
        amount NUMERIC(12, 2),
        title TEXT NOT NULL,
        description TEXT,
        priority TEXT DEFAULT 'medium' NOT NULL,
        status TEXT DEFAULT 'pending' NOT NULL,
        reason TEXT,
        metadata JSONB,
        due_date TIMESTAMP,
        decided_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 34. تم إنشاء جدول approvals');

    // 35. جدول قنوات المحادثة
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS channels (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type TEXT DEFAULT 'approval' NOT NULL,
        related_object_type TEXT,
        related_object_id VARCHAR,
        participant_ids JSONB NOT NULL,
        is_private BOOLEAN DEFAULT false NOT NULL,
        created_by VARCHAR NOT NULL REFERENCES users(id),
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 35. تم إنشاء جدول channels');

    // 36. جدول الرسائل للمحادثة
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        channel_id VARCHAR NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
        sender_id VARCHAR NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text' NOT NULL,
        attachments JSONB,
        related_object_type TEXT,
        related_object_id VARCHAR,
        is_decision BOOLEAN DEFAULT false NOT NULL,
        decision_type TEXT,
        is_edited BOOLEAN DEFAULT false NOT NULL,
        edited_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 36. تم إنشاء جدول messages');

    // 37. جدول الإجراءات التصحيحية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS actions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium' NOT NULL,
        owner_id VARCHAR NOT NULL REFERENCES users(id),
        assigned_to VARCHAR REFERENCES users(id),
        related_object_type TEXT,
        related_object_id VARCHAR,
        status TEXT DEFAULT 'open' NOT NULL,
        progress INTEGER DEFAULT 0 NOT NULL,
        estimated_cost NUMERIC(10, 2),
        actual_cost NUMERIC(10, 2),
        due_date DATE,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        updated_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 37. تم إنشاء جدول actions');

    // 38. جدول أحداث النظام
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        object_type TEXT NOT NULL,
        object_id VARCHAR NOT NULL,
        user_id VARCHAR REFERENCES users(id),
        event_data JSONB NOT NULL,
        processed BOOLEAN DEFAULT false NOT NULL,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 38. تم إنشاء جدول system_events');

    // 39. جدول الحسابات المالية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS accounts (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        currency TEXT DEFAULT 'SAR' NOT NULL,
        parent_id VARCHAR,
        is_active BOOLEAN DEFAULT true NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 39. تم إنشاء جدول accounts');

    // 40. جدول العمليات المالية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_number TEXT,
        date DATE NOT NULL,
        description TEXT,
        total_amount NUMERIC(12, 2) NOT NULL,
        currency TEXT DEFAULT 'SAR' NOT NULL,
        status TEXT DEFAULT 'draft' NOT NULL,
        transaction_type TEXT NOT NULL,
        project_id VARCHAR REFERENCES projects(id),
        related_object_type TEXT,
        related_object_id VARCHAR,
        created_by VARCHAR REFERENCES users(id),
        approved_by VARCHAR REFERENCES users(id),
        posted_by VARCHAR REFERENCES users(id),
        approved_at TIMESTAMP,
        posted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 40. تم إنشاء جدول transactions');

    // 41. جدول أسطر القيود
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transaction_lines (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
        account_id VARCHAR NOT NULL REFERENCES accounts(id),
        debit NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        credit NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        description TEXT,
        cost_center TEXT,
        project_id VARCHAR REFERENCES projects(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 41. تم إنشاء جدول transaction_lines');

    // 42. جدول دفاتر اليومية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS journals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR NOT NULL REFERENCES transactions(id),
        journal_number TEXT UNIQUE,
        period TEXT NOT NULL,
        is_reversed BOOLEAN DEFAULT false NOT NULL,
        reversal_journal_id VARCHAR,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        posted_at TIMESTAMP
      )
    `);
    console.log('✅ 42. تم إنشاء جدول journals');

    // 43. جدول المدفوعات والتسويات المالية
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS finance_payments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR REFERENCES transactions(id),
        payment_number TEXT UNIQUE,
        payment_type TEXT NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        currency TEXT DEFAULT 'SAR' NOT NULL,
        from_account VARCHAR REFERENCES accounts(id),
        to_account VARCHAR REFERENCES accounts(id),
        bank_reference TEXT,
        check_number TEXT,
        due_date DATE,
        paid_date DATE,
        payer_id VARCHAR,
        payee_id VARCHAR,
        status TEXT DEFAULT 'pending' NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 43. تم إنشاء جدول finance_payments');

    // 44. جدول أحداث النظام المالي
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS finance_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        event_name TEXT NOT NULL,
        event_type TEXT NOT NULL,
        object_type TEXT,
        object_id VARCHAR,
        payload JSONB,
        metadata JSONB,
        triggered_by VARCHAR REFERENCES users(id),
        processed BOOLEAN DEFAULT false NOT NULL,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT now() NOT NULL
      )
    `);
    console.log('✅ 44. تم إنشاء جدول finance_events');

    // 45. جدول أرصدة الحسابات
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS account_balances (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id VARCHAR NOT NULL REFERENCES accounts(id),
        project_id VARCHAR REFERENCES projects(id),
        period TEXT NOT NULL,
        opening_balance NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        debit_total NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        credit_total NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        closing_balance NUMERIC(12, 2) DEFAULT '0' NOT NULL,
        last_updated TIMESTAMP DEFAULT now() NOT NULL,
        created_at TIMESTAMP DEFAULT now() NOT NULL,
        UNIQUE (account_id, period, project_id)
      )
    `);
    console.log('✅ 45. تم إنشاء جدول account_balances');

    // إنشاء المستخدم التجريبي
    const password = 'admin123';
    const crypto = await import('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    await db.execute(sql`
      INSERT INTO users (email, password, first_name, last_name, role, is_active)
      VALUES ('admin@test.com', ${hashedPassword}, 'مدير', 'النظام', 'admin', true)
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('✅ تم إنشاء المستخدم التجريبي');

    // فحص عدد الجداول النهائي
    const tableCountResult = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    console.log('🎉 تم إنشاء جميع الجداول بنجاح!');
    console.log(`📊 إجمالي الجداول المنشأة: ${tableCountResult.rows[0]?.count || 'غير محدد'}`);
    console.log('');
    console.log('📧 البريد الإلكتروني: admin@test.com');
    console.log('🔐 كلمة المرور: admin123');
    
  } catch (error: any) {
    console.error('❌ خطأ في إنشاء الجداول:', error.message);
    console.error('تفاصيل الخطأ:', error);
  }
  
  process.exit(0);
}

createAllTablesComplete();
