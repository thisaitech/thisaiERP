
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Gear,
  Receipt,
  Printer,
  Percent,
  Bell,
  ChatCircle,
  Users,
  Package,
  Globe,
  Building,
  Database,
  Table,
  CloudArrowUp,
  HardDrive,
  CreditCard,
  Toolbox,
  ShareNetwork,
  Icon,
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import Loading from '../components/Loading';

const DeveloperToolsSection = lazy(() => import('../components/settings/DeveloperToolsSection').then(module => ({ default: module.DeveloperToolsSection })));
const LanguageSettingsSection = lazy(() => import('../components/settings/LanguageSettingsSection').then(module => ({ default: module.LanguageSettingsSection })));
const GeneralSettingsSection = lazy(() => import('../components/settings/GeneralSettings').then(module => ({ default: module.GeneralSettingsSection })));
const CompanySettingsSection = lazy(() => import('../components/settings/CompanySettings').then(module => ({ default: module.CompanySettingsSection })));
const RazorpaySettingsSection = lazy(() => import('../components/settings/RazorpaySettings').then(module => ({ default: module.RazorpaySettingsSection })));
const OfflineSyncSettingsSection = lazy(() => import('../components/settings/OfflineSyncSettings').then(module => ({ default: module.OfflineSyncSettingsSection })));
const BackupExportSettingsSection = lazy(() => import('../components/settings/BackupExportSettings').then(module => ({ default: module.BackupExportSettingsSection })));
const TransactionSettingsSection = lazy(() => import('../components/settings/TransactionSettings').then(module => ({ default: module.TransactionSettingsSection })));
const InvoiceTableSettingsSection = lazy(() => import('../components/settings/InvoiceTableSettings').then(module => ({ default: module.InvoiceTableSettingsSection })));
const TaxSettingsSection = lazy(() => import('../components/settings/TaxSettings').then(module => ({ default: module.TaxSettingsSection })));
const UserManagementSettingsSection = lazy(() => import('../components/settings/UserManagementSettingsSection').then(module => ({ default: module.UserManagementSettingsSection })));
const SMSSettingsSection = lazy(() => import('../components/settings/SMSSettingsSection').then(module => ({ default: module.SMSSettingsSection })));
const ReminderSettingsSection = lazy(() => import('../components/settings/ReminderSettingsSection').then(module => ({ default: module.ReminderSettingsSection })));
const PartySettingsSection = lazy(() => import('../components/settings/PartySettingsSection').then(module => ({ default: module.PartySettingsSection })));
const ItemSettingsSection = lazy(() => import('../components/settings/ItemSettingsSection').then(module => ({ default: module.ItemSettingsSection })));
const UtilitiesSettingsSection = lazy(() => import('../components/settings/UtilitiesSettingsSection').then(module => ({ default: module.UtilitiesSettingsSection })));

interface SettingsSection {
  id: string;
  label: string;
  icon: Icon;
  component: React.ComponentType;
}

const Settings = () => {
  const { t } = useLanguage();
  const [selectedSection, setSelectedSection] = useState('general');

  const settingsSections: SettingsSection[] = useMemo(
    () => [
      { id: 'general', label: t.settings.general, icon: Gear, component: GeneralSettingsSection },
      { id: 'language', label: t.settings.languageLabel, icon: Globe, component: LanguageSettingsSection },
      { id: 'company', label: t.settings.companyInfo, icon: Building, component: CompanySettingsSection },
      { id: 'razorpay', label: t.settings.razorpayPayments, icon: CreditCard, component: RazorpaySettingsSection },
      { id: 'offlineSync', label: t.settings.offlineAndSync, icon: CloudArrowUp, component: OfflineSyncSettingsSection },
      { id: 'backup', label: t.settings.backupAndExport, icon: HardDrive, component: BackupExportSettingsSection },
      { id: 'transaction', label: t.settings.transaction, icon: Receipt, component: TransactionSettingsSection },
      { id: 'invoice', label: t.settings.invoicePrint, icon: Printer, component: TransactionSettingsSection },
      { id: 'invoiceTable', label: t.settings.invoiceTable, icon: Table, component: InvoiceTableSettingsSection },
      { id: 'taxes', label: t.settings.taxesAndGst, icon: Percent, component: TaxSettingsSection },
      { id: 'users', label: t.settings.userManagement, icon: Users, component: UserManagementSettingsSection },
      { id: 'sms', label: t.settings.transactionalSms, icon: ChatCircle, component: SMSSettingsSection },
      { id: 'reminders', label: t.settings.reminders, icon: Bell, component: ReminderSettingsSection },
      { id: 'party', label: t.settings.partySettings, icon: ShareNetwork, component: PartySettingsSection },
      { id: 'items', label: t.settings.itemSettings, icon: Package, component: ItemSettingsSection },
      { id: 'utilities', label: t.settings.utilities, icon: Toolbox, component: UtilitiesSettingsSection },
      { id: 'developer', label: t.settings.developerTools, icon: Database, component: DeveloperToolsSection },
    ],
    [t]
  );

  const renderSection = () => {
    const section = settingsSections.find((s) => s.id === selectedSection);
    if (section) {
      const Component = section.component;
      return <Component />;
    }
    return null;
  };

  const activeShadow = "shadow-[4px_4px_8px_#e0e3e7,-4px_-4px_8px_#ffffff] dark:shadow-[4px_4px_8px_#1e293b,-4px_-4px_8px_#334155]";
  const inactiveShadow = "shadow-[3px_3px_6px_#e0e3e7,-3px_-3px_6px_#ffffff] dark:shadow-[3px_3px_6px_#1e293b,-3px_-3px_6px_#334155]";

  return (
    <div className="overflow-x-hidden flex flex-col max-w-[100vw] w-full px-4 py-3 bg-[#f5f7fa] dark:bg-slate-900 min-h-screen">
      <div className="flex-shrink-0">
        <div className="mb-3">
          <div className="flex items-center justify-center flex-wrap gap-2">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={cn(
                  "px-3 py-2 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap flex items-center gap-1.5 duration-200",
                  selectedSection === section.id
                    ? `bg-purple-600 text-white ${activeShadow}`
                    : `bg-[#f5f7fa] dark:bg-slate-800 text-slate-600 dark:text-slate-400 ${inactiveShadow} hover:text-purple-600 dark:hover:text-purple-400`
                )}
              >
                <section.icon size={14} weight={selectedSection === section.id ? "duotone" : "regular"} />
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="bg-[#f5f7fa] dark:bg-slate-800 rounded-xl p-4 shadow-[6px_6px_12px_#e0e3e7,-6px_-6px_12px_#ffffff] dark:shadow-[6px_6px_12px_#1e293b,-6px_-6px_12px_#334155]">
          <Suspense fallback={<Loading />}>
            {renderSection()}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Settings;
