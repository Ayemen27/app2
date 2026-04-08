import type { ProjectComprehensiveReportData, ReportKPI } from '../../../../shared/report-types';
import {
  escapeHtml, formatNum, formatInt, formatDateBR, PDF_COLORS,
  pdfHeader, pdfInfoBar, pdfKpiStrip, pdfSectionTitle,
  pdfTotalRow, pdfGrandTotalRow, pdfSignatures, pdfFooter, pdfWrap,
} from './shared-styles';

function kpiDisplay(kpi: ReportKPI): { value: string; color?: string } {
  switch (kpi.format) {
    case 'currency': return { value: `${formatNum(kpi.value)} YER`, color: PDF_COLORS.navy };
    case 'percentage': return { value: `${kpi.value.toFixed(1)}%`, color: PDF_COLORS.amber };
    case 'days': return { value: `${formatNum(kpi.value)}`, color: '#ED7D31' };
    default: return { value: formatInt(kpi.value) };
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'قيد الانتظار',
    in_progress: 'جارية',
    completed: 'مكتملة',
    active: 'نشط',
    inactive: 'غير نشط',
    maintenance: 'صيانة',
    excellent: 'ممتاز',
    good: 'جيد',
    fair: 'متوسط',
    poor: 'ضعيف',
    available: 'متاح',
    unavailable: 'غير متاح',
    in_use: 'قيد الاستخدام',
    damaged: 'تالف',
    lost: 'مفقود',
    retired: 'مُستبعد',
    reserved: 'محجوز',
    under_repair: 'تحت الإصلاح',
    new: 'جديد',
    used: 'مستعمل',
    broken: 'معطل',
    rented: 'مؤجر',
    consumed: 'مستهلك',
    missing: 'مفقود',
    disposed: 'تم التخلص',
    transferred: 'منقول',
    out_of_service: 'خارج الخدمة',
    operational: 'تشغيلي',
    idle: 'عاطل',
    sold: 'مباع',
  };
  return map[status?.toLowerCase()] || status;
}

function statusColor(status: string): string {
  if (status === 'completed' || status === 'active' || status === 'excellent' || status === 'available') return PDF_COLORS.green;
  if (status === 'in_progress' || status === 'good' || status === 'in_use' || status === 'reserved') return PDF_COLORS.amber;
  if (status === 'pending' || status === 'fair' || status === 'new') return '#6C757D';
  return PDF_COLORS.red;
}

export function generateProjectComprehensiveHTML(data: ProjectComprehensiveReportData): string {
  const kpis = data.kpis.map(k => {
    const d = kpiDisplay(k);
    return { label: k.label, value: d.value, color: d.color };
  });

  let body = '';
  body += pdfHeader('الفتيني للمقاولات العامة والاستشارات الهندسية', 'التقرير الشامل للمشروع');
  body += pdfInfoBar(
    [
      `<b>المشروع:</b> ${escapeHtml(data.project.name)}`,
      data.project.location ? `<b>الموقع:</b> ${escapeHtml(data.project.location)}` : '',
      data.project.engineerName ? `<b>المهندس:</b> ${escapeHtml(data.project.engineerName)}` : '',
      data.project.status ? `<b>الحالة:</b> ${escapeHtml(data.project.status)}` : '',
    ].filter(Boolean),
    [
      `<b>الفترة من:</b> ${formatDateBR(data.period.from)}`,
      `<b>الفترة إلى:</b> ${formatDateBR(data.period.to)}`,
      data.project.managerName ? `<b>المدير:</b> ${escapeHtml(data.project.managerName)}` : '',
      data.project.budget ? `<b>الميزانية:</b> ${formatNum(data.project.budget)} YER` : '',
    ].filter(Boolean)
  );
  body += pdfKpiStrip(kpis);

  body += pdfSectionTitle('👷 القوى العاملة');
  body += `<div style="display:flex;gap:10px;margin:4px 0 6px;">
    <div style="flex:1;background:${PDF_COLORS.greenBg};border:1px solid ${PDF_COLORS.green};border-radius:6px;padding:6px;text-align:center;">
      <div style="font-size:8px;color:${PDF_COLORS.textMuted};">إجمالي العمال</div>
      <div style="font-size:14px;font-weight:800;color:${PDF_COLORS.green};">${data.workforce.totalWorkers}</div>
    </div>
    <div style="flex:1;background:#FFF3E0;border:1px solid ${PDF_COLORS.amber};border-radius:6px;padding:6px;text-align:center;">
      <div style="font-size:8px;color:${PDF_COLORS.textMuted};">العمال النشطون</div>
      <div style="font-size:14px;font-weight:800;color:${PDF_COLORS.amber};">${data.workforce.activeWorkers}</div>
    </div>
  </div>`;

  if (data.workforce.workersByType.length > 0) {
    body += `<table><thead><tr>
      <th>النوع</th><th>العدد</th><th>أيام العمل</th><th>إجمالي الأجور</th>
    </tr></thead><tbody>`;
    let totalTypeCount = 0, totalTypeDays = 0, totalTypeWages = 0;
    data.workforce.workersByType.forEach(w => {
      totalTypeCount += w.count;
      totalTypeDays += w.totalDays;
      totalTypeWages += w.totalWages;
      body += `<tr>
        <td style="text-align:right;">${escapeHtml(w.type)}</td>
        <td>${w.count}</td>
        <td>${formatNum(w.totalDays)}</td>
        <td class="debit-cell">${formatNum(w.totalWages)}</td>
      </tr>`;
    });
    body += pdfGrandTotalRow(['الإجمالي', String(totalTypeCount), formatNum(totalTypeDays), formatNum(totalTypeWages)]);
    body += `</tbody></table>`;
  }

  if (data.workforce.topWorkers.length > 0) {
    body += `<div style="font-size:9px;font-weight:700;color:${PDF_COLORS.navy};margin:6px 0 3px;">أعلى 20 عامل من حيث الأجور</div>`;
    body += `<table><thead><tr>
      <th>#</th><th>الاسم</th><th>النوع</th><th>الأيام</th><th>المستحق</th><th>المدفوع</th><th>الحوالات</th><th>التسويات</th><th>التصفية البينية</th><th>المتبقي الصافي</th>
    </tr></thead><tbody>`;
    let topTotalDays = 0, topTotalEarned = 0, topTotalPaid = 0, topTotalTransfers = 0, topTotalSettled = 0, topTotalRebalance = 0, topTotalBalance = 0;
    data.workforce.topWorkers.forEach((w, i) => {
      topTotalDays += w.totalDays;
      topTotalEarned += w.totalEarned;
      topTotalPaid += w.totalPaid;
      topTotalTransfers += (w.totalTransfers || 0);
      topTotalSettled += (w.totalSettled || 0);
      topTotalRebalance += (w.rebalanceDelta || 0);
      topTotalBalance += w.balance;
      body += `<tr>
        <td>${i + 1}</td>
        <td style="text-align:right;">${escapeHtml(w.name)}</td>
        <td>${escapeHtml(w.type)}</td>
        <td>${formatNum(w.totalDays)}</td>
        <td class="debit-cell">${formatNum(w.totalEarned)}</td>
        <td class="credit-cell">${formatNum(w.totalPaid)}</td>
        <td class="credit-cell">${formatNum(w.totalTransfers || 0)}</td>
        <td class="credit-cell">${formatNum(w.totalSettled || 0)}</td>
        <td style="color:#7C3AED;font-weight:600;">${formatNum(w.rebalanceDelta || 0)}</td>
        <td class="balance-cell" style="color:${w.balance >= 0 ? '#16a34a' : '#C0392B'};">${formatNum(w.balance)}</td>
      </tr>`;
    });
    body += pdfGrandTotalRow(['', 'الإجمالي', '', formatNum(topTotalDays), formatNum(topTotalEarned), formatNum(topTotalPaid), formatNum(topTotalTransfers), formatNum(topTotalSettled), formatNum(topTotalRebalance), formatNum(topTotalBalance)]);
    body += `</tbody></table>`;
  }

  if (data.wells.totalWells > 0) {
    body += pdfSectionTitle(`🔵 الآبار (${data.wells.totalWells} بئر)`);
    body += `<div style="display:flex;gap:10px;margin:4px 0 6px;">
      <div style="flex:1;background:${PDF_COLORS.lightBg};border:1px solid ${PDF_COLORS.border};border-radius:6px;padding:6px;text-align:center;">
        <div style="font-size:8px;color:${PDF_COLORS.textMuted};">متوسط الإنجاز</div>
        <div style="font-size:14px;font-weight:800;color:${PDF_COLORS.navy};">${data.wells.avgCompletionPercentage.toFixed(1)}%</div>
      </div>
      <div style="flex:1;background:${PDF_COLORS.lightBg};border:1px solid ${PDF_COLORS.border};border-radius:6px;padding:6px;text-align:center;">
        <div style="font-size:8px;color:${PDF_COLORS.textMuted};">إجمالي الألواح</div>
        <div style="font-size:14px;font-weight:800;color:${PDF_COLORS.navy};">${formatInt(data.wells.totalPanels || 0)}</div>
      </div>
      <div style="flex:1;background:${PDF_COLORS.lightBg};border:1px solid ${PDF_COLORS.border};border-radius:6px;padding:6px;text-align:center;">
        <div style="font-size:8px;color:${PDF_COLORS.textMuted};">إجمالي القواعد</div>
        <div style="font-size:14px;font-weight:800;color:${PDF_COLORS.navy};">${formatInt(data.wells.totalBases || 0)}</div>
      </div>
      <div style="flex:1;background:${PDF_COLORS.lightBg};border:1px solid ${PDF_COLORS.border};border-radius:6px;padding:6px;text-align:center;">
        <div style="font-size:8px;color:${PDF_COLORS.textMuted};">إجمالي المواسير</div>
        <div style="font-size:14px;font-weight:800;color:${PDF_COLORS.navy};">${formatInt(data.wells.totalPipes || 0)}</div>
      </div>
      ${data.wells.byStatus.map(s => `
      <div style="flex:1;background:${PDF_COLORS.lightBg};border:1px solid ${PDF_COLORS.border};border-radius:6px;padding:6px;text-align:center;">
        <div style="font-size:8px;color:${PDF_COLORS.textMuted};">${escapeHtml(statusLabel(s.status))}</div>
        <div style="font-size:14px;font-weight:800;color:${statusColor(s.status)};">${s.count}</div>
      </div>`).join('')}
    </div>`;

    body += `<table><thead><tr>
      <th>#</th><th>رقم البئر</th><th>المالك</th><th>المنطقة</th><th>العمق</th><th>الألواح</th><th>القواعد</th><th>المواسير</th><th>الحالة</th>
    </tr></thead><tbody>`;
    data.wells.wellsList.forEach((w, i) => {
      body += `<tr>
        <td>${i + 1}</td>
        <td>${w.wellNumber}</td>
        <td style="text-align:right;">${escapeHtml(w.ownerName)}</td>
        <td>${escapeHtml(w.region)}</td>
        <td>${w.depth} م</td>
        <td>${w.panelCount || 0}</td>
        <td>${w.baseCount || 0}</td>
        <td>${w.pipeCount || 0}</td>
        <td style="color:${statusColor(w.status)};font-weight:600;">${escapeHtml(statusLabel(w.status))}</td>
      </tr>`;
    });
    body += pdfGrandTotalRow(['', '', '', 'الإجمالي', `${formatInt(data.wells.totalDepth)} م`, formatInt(data.wells.totalPanels || 0), formatInt(data.wells.totalBases || 0), formatInt(data.wells.totalPipes || 0), '']);
    body += `</tbody></table>`;
  }

  body += pdfSectionTitle('💰 ملخص المصروفات');
  body += `<table><thead><tr>
    <th>البند</th><th>المبلغ</th><th>النسبة من الإجمالي</th>
  </tr></thead><tbody>`;
  const expenseItems = [
    { label: 'أجور العمال (المدفوع)', amount: data.totals.totalWages },
    { label: 'مشتريات المواد (نقداً)', amount: data.totals.totalMaterials },
    { label: 'مصاريف النقل', amount: data.totals.totalTransport },
    { label: 'مصاريف متنوعة', amount: data.totals.totalMisc },
    { label: 'حوالات العمال', amount: data.totals.totalWorkerTransfers },
    { label: 'تحويلات لمشاريع أخرى', amount: data.totals.totalProjectTransfersOut || 0 },
    { label: 'دفعات الموردين', amount: data.totals.totalSupplierPayments || 0 },
  ];
  expenseItems.forEach(item => {
    const pct = data.totals.totalExpenses > 0 ? (item.amount / data.totals.totalExpenses * 100) : 0;
    body += `<tr>
      <td style="text-align:right;font-weight:600;">${item.label}</td>
      <td class="debit-cell">${formatNum(item.amount)}</td>
      <td><div style="display:flex;align-items:center;gap:4px;justify-content:center;">
        <div style="flex:1;max-width:120px;background:#e9ecef;border-radius:3px;overflow:hidden;height:12px;">
          <div style="background:${PDF_COLORS.accentBlue};height:100%;width:${Math.min(pct, 100)}%;"></div>
        </div>
        <span style="font-size:8px;font-weight:600;">${pct.toFixed(1)}%</span>
      </div></td>
    </tr>`;
  });
  body += pdfGrandTotalRow(['إجمالي المصروفات', formatNum(data.totals.totalExpenses), '100%']);
  body += `</tbody></table>`;

  if (data.expenses.materials.byCategory.length > 0) {
    body += `<div style="font-size:9px;font-weight:700;color:${PDF_COLORS.navy};margin:6px 0 3px;">المواد حسب الفئة</div>`;
    body += `<table><thead><tr><th>الفئة</th><th>المبلغ</th><th>عدد المشتريات</th></tr></thead><tbody>`;
    data.expenses.materials.byCategory.forEach(c => {
      body += `<tr><td style="text-align:right;">${escapeHtml(c.category)}</td><td>${formatNum(c.total)}</td><td>${c.count}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (data.expenses.supplierPayments?.items && data.expenses.supplierPayments.items.length > 0) {
    body += `<div style="font-size:9px;font-weight:700;color:${PDF_COLORS.navy};margin:6px 0 3px;">تفاصيل دفعات الموردين</div>`;
    body += `<table><thead><tr><th>#</th><th>المورد</th><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>رقم المرجع</th></tr></thead><tbody>`;
    data.expenses.supplierPayments.items.forEach((sp, i) => {
      body += `<tr><td>${i + 1}</td><td style="text-align:right;">${escapeHtml(sp.supplierName)}</td><td>${formatDateBR(sp.paymentDate)}</td><td class="debit-cell">${formatNum(sp.amount)}</td><td>${escapeHtml(sp.paymentMethod)}</td><td>${escapeHtml(sp.referenceNumber)}</td></tr>`;
    });
    body += pdfGrandTotalRow(['الإجمالي', '', '', formatNum(data.expenses.supplierPayments.total), '', '']);
    body += `</tbody></table>`;
  }

  body += pdfSectionTitle('🏦 الصندوق والأمانات');
  const custodyIncome = data.cashCustody.totalFundTransfersIn + data.cashCustody.totalProjectTransfersIn;
  body += `<table class="summary-table" style="width:100%;"><tbody>
    <tr><td class="label-cell">إجمالي التحويلات الواردة</td><td class="value-cell debit-cell">${formatNum(data.cashCustody.totalFundTransfersIn)}</td></tr>
    <tr><td class="label-cell">تحويلات من مشاريع أخرى (وارد)</td><td class="value-cell debit-cell">${formatNum(data.cashCustody.totalProjectTransfersIn)}</td></tr>
    <tr style="border-top:2px solid ${PDF_COLORS.navy};"><td class="label-cell" style="font-weight:800;">إجمالي الدخل</td><td class="value-cell debit-cell" style="font-weight:800;">${formatNum(custodyIncome)}</td></tr>
    <tr><td class="label-cell">إجمالي المصروفات (شامل الترحيل الصادر)</td><td class="value-cell credit-cell">${formatNum(data.cashCustody.totalExpenses)}</td></tr>
  </tbody>`;
  body += pdfGrandTotalRow(['صافي الرصيد', formatNum(data.cashCustody.netBalance)]);
  body += `</table>`;

  if (data.cashCustody.fundTransferItems.length > 0) {
    body += `<div style="font-size:9px;font-weight:700;color:${PDF_COLORS.navy};margin:6px 0 3px;">تفاصيل التحويلات</div>`;
    body += `<table><thead><tr><th>#</th><th>التاريخ</th><th>المرسل</th><th>النوع</th><th>المبلغ</th></tr></thead><tbody>`;
    data.cashCustody.fundTransferItems.forEach((ft, i) => {
      body += `<tr><td>${i + 1}</td><td>${formatDateBR(ft.date)}</td><td style="text-align:right;">${escapeHtml(ft.senderName)}</td><td>${escapeHtml(ft.transferType)}</td><td style="font-weight:700;">${formatNum(ft.amount)}</td></tr>`;
    });
    body += `</tbody></table>`;
  }

  if (data.equipmentSummary.totalEquipment > 0) {
    body += pdfSectionTitle(`🔧 المعدات (${data.equipmentSummary.totalEquipment})`);
    body += `<table><thead><tr>
      <th>#</th><th>الاسم</th><th>الكود</th><th>النوع</th><th>الحالة</th><th>الحالة الفنية</th><th>الكمية</th>
    </tr></thead><tbody>`;
    data.equipmentSummary.items.forEach((eq, i) => {
      body += `<tr>
        <td>${i + 1}</td>
        <td style="text-align:right;">${escapeHtml(eq.name)}</td>
        <td>${escapeHtml(eq.code)}</td>
        <td>${escapeHtml(eq.type)}</td>
        <td style="color:${statusColor(eq.status)};font-weight:600;">${escapeHtml(statusLabel(eq.status))}</td>
        <td>${escapeHtml(statusLabel(eq.condition))}</td>
        <td>${eq.quantity}</td>
      </tr>`;
    });
    body += `</tbody></table>`;
  }

  body += pdfSignatures(['مدير المشروع', 'المهندس المسؤول', 'المحاسب']);
  body += pdfFooter(data.generatedAt);

  return pdfWrap('التقرير الشامل للمشروع', body);
}
