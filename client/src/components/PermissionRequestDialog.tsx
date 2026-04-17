import React, { useState, useEffect, useCallback } from 'react';
import { Bell, ShieldCheck, AlertTriangle, Settings, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkAllPermissions, requestPermission, type PermissionInfo, type PermissionId } from '@/services/permissionManager';
import { Capacitor } from '@capacitor/core';

interface Step {
  info: PermissionInfo;
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
}

function buildSteps(perms: PermissionInfo[]): Step[] {
  const steps: Step[] = [];

  const push = perms.find(p => p.id === 'push');
  if (push && !push.granted) {
    steps.push({
      info: push,
      title: 'الإشعارات الفورية',
      description: 'احصل على تنبيهات فورية بمستجدات مشاريعك والتقارير المالية ومدفوعات العمال.',
      icon: <Bell className="w-10 h-10 text-blue-500" />,
      benefits: [
        'تنبيهات التحويلات المالية فور حدوثها',
        'تحديثات حالة المشاريع لحظة بلحظة',
        'تذكير بمواعيد الرواتب والدفعات',
      ],
    });
  }

  const local = perms.find(p => p.id === 'local');
  if (local && !local.granted) {
    steps.push({
      info: local,
      title: 'إشعارات التطبيق',
      description: 'إشعارات داخل التطبيق لتنبيهك بتحديثات الإصدارات والعمليات الجارية.',
      icon: <ShieldCheck className="w-10 h-10 text-green-500" />,
      benefits: [
        'إشعار عند توفر تحديث جديد',
        'تأكيد اكتمال عمليات المزامنة',
        'تنبيهات إعدادات الأمان',
      ],
    });
  }

  return steps;
}

interface Props {
  onDone: () => void;
}

export default function PermissionRequestDialog({ onDone }: Props) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<'rationale' | 'denied' | 'done'>('rationale');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!Capacitor.isNativePlatform()) { onDone(); return; }
      const perms = await checkAllPermissions();
      const needed = perms.filter(p => !p.granted && (p.needsRationale || p.needsSettings));
      if (!cancelled) {
        if (needed.length === 0) { onDone(); return; }
        const builtSteps = buildSteps(perms).filter(s => needed.find(n => n.id === s.info.id));
        setSteps(builtSteps);
        setTimeout(() => setVisible(true), 400);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [onDone]);

  const currentStep = steps[currentIndex];

  const advance = useCallback(() => {
    const next = currentIndex + 1;
    if (next < steps.length) {
      setCurrentIndex(next);
      setPhase('rationale');
    } else {
      setVisible(false);
      setTimeout(onDone, 300);
    }
  }, [currentIndex, steps.length, onDone]);

  const handleAllow = useCallback(async () => {
    if (!currentStep) return;
    setLoading(true);
    try {
      const granted = await requestPermission(currentStep.info.id as PermissionId);
      if (granted) {
        advance();
      } else {
        setPhase('denied');
      }
    } finally {
      setLoading(false);
    }
  }, [currentStep, advance]);

  const handleSkip = useCallback(() => {
    advance();
  }, [advance]);

  const handleOpenSettings = useCallback(async () => {
    try {
      if (Capacitor.isPluginAvailable('Browser')) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: 'package:com.axion.app', windowName: '_system' });
      }
    } catch {}
    advance();
  }, [advance]);

  if (!visible || steps.length === 0) return null;

  const isSettingsNeeded = currentStep?.info.needsSettings;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-end justify-center transition-all duration-300 ${
        visible ? 'bg-black/50' : 'bg-transparent pointer-events-none'
      }`}
      dir="rtl"
    >
      <div
        className={`w-full max-w-lg bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Skip button */}
        <div className="flex justify-end px-5 pt-2">
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            data-testid="button-perm-skip"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-8">
          {/* Step dots */}
          {steps.length > 1 && (
            <div className="flex justify-center gap-2 mb-5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}

          {phase === 'rationale' && currentStep && (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center">
                  {currentStep.icon}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                {currentStep.title}
              </h2>
              <p className="text-gray-500 text-center text-sm leading-relaxed mb-5">
                {currentStep.description}
              </p>

              {/* Benefits */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
                {currentStep.benefits.map((b, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <ChevronRight className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0 rotate-180" />
                    <span className="text-gray-700 text-sm">{b}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <Button
                className="w-full h-12 rounded-xl text-base font-semibold bg-blue-600 hover:bg-blue-700 mb-3"
                onClick={handleAllow}
                disabled={loading}
                data-testid="button-perm-allow"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    جارٍ الطلب...
                  </span>
                ) : (
                  'السماح للتطبيق'
                )}
              </Button>

              <button
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
                onClick={handleSkip}
                data-testid="button-perm-later"
              >
                ليس الآن
              </button>
            </>
          )}

          {phase === 'denied' && (
            <>
              <div className="flex justify-center mb-5">
                <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-orange-500" />
                </div>
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
                الإذن مرفوض
              </h2>
              <p className="text-gray-500 text-center text-sm leading-relaxed mb-5">
                لم يتم منح الإذن. يمكنك تفعيله يدوياً من إعدادات الجهاز.
              </p>

              <div className="bg-orange-50 rounded-2xl p-4 mb-6 space-y-2">
                <p className="text-sm font-medium text-orange-800 mb-2">لتفعيل الإشعارات يدوياً:</p>
                {[
                  'افتح "الإعدادات" على جهازك',
                  'اختر "التطبيقات" أو "إدارة التطبيقات"',
                  'ابحث عن تطبيق "AXION"',
                  'اختر "الأذونات" ثم فعّل "الإشعارات"',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-orange-200 text-orange-800 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-orange-700 text-sm">{step}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full h-12 rounded-xl text-base font-semibold bg-orange-500 hover:bg-orange-600 mb-3"
                onClick={handleOpenSettings}
                data-testid="button-perm-settings"
              >
                <Settings className="w-4 h-4 ml-2" />
                فتح الإعدادات
              </Button>

              <button
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
                onClick={advance}
                data-testid="button-perm-deny-skip"
              >
                التخطي في الوقت الحالي
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
