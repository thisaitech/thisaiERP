import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/utils';
import { Globe } from '@phosphor-icons/react';

const LanguageSettingsSection = () => {
    const { language, setLanguage, availableLanguages, t } = useLanguage()
  
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-xl font-bold mb-2">Language Settings</h2>
        <p className="text-muted-foreground text-sm mb-6">மொழி அமைப்புகள் - Choose your preferred language</p>
        
        <div className="space-y-6">
          {/* Language Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code)}
                className={cn(
                  "p-6 rounded-xl border-2 transition-all text-left",
                  language === lang.code
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{lang.flag}</span>
                  <div>
                    <h3 className="font-bold text-lg">{lang.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {lang.code === 'en' ? 'English Language' : 'தமிழ் மொழி'}
                    </p>
                  </div>
                </div>
                {language === lang.code && (
                  <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {lang.code === 'en' ? 'Currently Active' : 'தற்போது செயலில்'}
                  </div>
                )}
              </button>
            ))}
          </div>
  
          {/* Preview Section */}
          <div className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-border">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Globe size={20} weight="duotone" />
              {language === 'en' ? 'Language Preview' : 'மொழி முன்னோட்டம்'}
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">{t.nav.dashboard}</p>
                <p className="font-medium">{t.common.today}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">{t.nav.sales}</p>
                <p className="font-medium">{t.sales.newSale}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">{t.nav.inventory}</p>
                <p className="font-medium">{t.inventory.items}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">{t.common.total}</p>
                <p className="font-medium">{t.common.amount}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">{t.common.save}</p>
                <p className="font-medium">{t.common.cancel}</p>
              </div>
              <div className="p-3 bg-background rounded-lg">
                <p className="text-muted-foreground text-xs mb-1">{t.parties.customer}</p>
                <p className="font-medium">{t.parties.supplier}</p>
              </div>
            </div>
          </div>
  
          {/* Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>{language === 'en' ? 'Note:' : 'குறிப்பு:'}</strong>{' '}
              {language === 'en' 
                ? 'Language changes will apply immediately across the entire application. Some system messages may still appear in English.'
                : 'மொழி மாற்றங்கள் முழு பயன்பாட்டிலும் உடனடியாக பொருந்தும். சில கணினி செய்திகள் ஆங்கிலத்தில் தோன்றலாம்.'
              }
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  export default LanguageSettingsSection;
