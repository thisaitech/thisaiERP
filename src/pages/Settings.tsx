
import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Gear,
  Users,
  Package,
  Globe,
  Building,
} from '@phosphor-icons/react';
import { cn } from '../lib/utils';
import Loading from '../components/Loading';
import useIsMobileViewport from '../hooks/useIsMobileViewport';
import MobilePageScaffold from '../components/mobile/MobilePageScaffold';
import MobileFilterChips from '../components/mobile/MobileFilterChips';

const LanguageSettingsSection = lazy(() => import('../components/settings/LanguageSettingsSection').then(module => ({ default: module.LanguageSettingsSection })));
const GeneralSettingsSection = lazy(() => import('../components/settings/GeneralSettings').then(module => ({ default: module.GeneralSettingsSection })));
const CompanySettingsSection = lazy(() => import('../components/settings/CompanySettings').then(module => ({ default: module.CompanySettingsSection })));
const PartySettingsSection = lazy(() => import('../components/settings/PartySettingsSection').then(module => ({ default: module.PartySettingsSection })));
const ItemSettingsSection = lazy(() => import('../components/settings/ItemSettingsSection').then(module => ({ default: module.ItemSettingsSection })));

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ComponentType;
}

const Settings = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const isMobileViewport = useIsMobileViewport();
  const [selectedSection, setSelectedSection] = useState('general');

  // Handle URL param for direct navigation (e.g., /settings?tab=subscription)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setSelectedSection(tab);
    }
  }, [searchParams]);

  const settingsSections: SettingsSection[] = useMemo(
    () => [
      { id: 'general', label: t.settings.general, icon: Gear, component: GeneralSettingsSection },
      { id: 'language', label: t.settings.languageLabel, icon: Globe, component: LanguageSettingsSection },
      { id: 'company', label: t.settings.companyInfo, icon: Building, component: CompanySettingsSection },
      { id: 'party', label: t.settings.partySettings, icon: Users, component: PartySettingsSection },
      { id: 'items', label: t.settings.itemSettings, icon: Package, component: ItemSettingsSection },
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

  return (
    <div className="erp-module-page overflow-x-hidden flex flex-col max-w-[100vw] w-full px-4 py-3">
      {isMobileViewport && (
        <MobilePageScaffold
          title={t.nav.settings}
          subtitle="Manage ERP preferences and business defaults"
        >
          <MobileFilterChips
            items={settingsSections.map((section) => ({
              id: section.id,
              label: section.label,
              icon: <section.icon size={16} weight={selectedSection === section.id ? 'duotone' : 'regular'} />,
            }))}
            activeId={selectedSection}
            onSelect={(id) => setSelectedSection(id)}
          />
        </MobilePageScaffold>
      )}

      <div className="flex-shrink-0">
        <div className={cn("mb-3", isMobileViewport && "hidden")}>
          <div className="erp-module-filter-wrap justify-center">
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={cn(
                  "erp-module-filter-chip flex items-center gap-2 whitespace-nowrap text-sm md:text-base",
                  selectedSection === section.id
                    ? "is-active"
                    : "text-slate-600 dark:text-slate-300"
                )}
              >
                <section.icon size={18} weight={selectedSection === section.id ? "duotone" : "regular"} />
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div className="erp-module-panel p-4">
          <Suspense fallback={<Loading />}>
            {renderSection()}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default Settings;
