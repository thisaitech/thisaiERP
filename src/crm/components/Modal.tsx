// Custom Modal Component for CRM
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

// Modal Types
interface ModalButton {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  onClick?: () => void;
}

interface ModalConfig {
  type: 'alert' | 'confirm' | 'prompt' | 'select' | 'custom';
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: string[]; // For select type
  allowCustom?: boolean; // Allow "Other" option with custom input
  buttons?: ModalButton[];
  onConfirm?: (value?: string) => void;
  onCancel?: () => void;
  children?: React.ReactNode;
}

interface ModalContextType {
  showAlert: (title: string, message: string) => Promise<void>;
  showConfirm: (title: string, message: string) => Promise<boolean>;
  showPrompt: (title: string, message: string, defaultValue?: string, placeholder?: string) => Promise<string | null>;
  showSelect: (title: string, message: string, options: string[], allowCustom?: boolean) => Promise<string | null>;
  showModal: (config: ModalConfig) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | null>(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

// Modal Component
const Modal: React.FC<{
  isOpen: boolean;
  config: ModalConfig | null;
  onClose: () => void;
  onResult: (result: any) => void;
}> = ({ isOpen, config, onClose, onResult }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    if (config?.defaultValue) {
      setInputValue(config.defaultValue);
      setSelectedOption(config.defaultValue);
    } else {
      setInputValue('');
      setSelectedOption('');
    }
    setShowCustomInput(false);
  }, [config]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
        onResult(config?.type === 'confirm' ? false : null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, onResult, config?.type]);

  if (!config) return null;

  const getButtonClasses = (variant: string = 'primary') => {
    const base = 'px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
      case 'secondary':
        return `${base} bg-slate-200 text-slate-800 hover:bg-slate-300 focus:ring-slate-500 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500`;
      case 'danger':
        return `${base} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
      case 'success':
        return `${base} bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500`;
      default:
        return `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    }
  };

  const handleConfirm = () => {
    if (config.type === 'prompt') {
      onResult(inputValue);
    } else if (config.type === 'select') {
      const value = showCustomInput ? inputValue : selectedOption;
      onResult(value);
    } else if (config.type === 'confirm') {
      onResult(true);
    } else {
      onResult(undefined);
    }
    const finalValue = config.type === 'select'
      ? (showCustomInput ? inputValue : selectedOption)
      : inputValue;
    config.onConfirm?.(finalValue);
    onClose();
  };

  const handleCancel = () => {
    if (config.type === 'confirm') {
      onResult(false);
    } else {
      onResult(null);
    }
    config.onCancel?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {config.title}
              </h3>
              <button
                onClick={handleCancel}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {config.message && (
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  {config.message}
                </p>
              )}

              {config.type === 'prompt' && (
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={config.placeholder || 'Enter value...'}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleConfirm();
                    }
                  }}
                />
              )}

              {config.type === 'select' && config.options && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {config.options.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedOption === option && !showCustomInput
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal-select"
                          value={option}
                          checked={selectedOption === option && !showCustomInput}
                          onChange={() => {
                            setSelectedOption(option);
                            setShowCustomInput(false);
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{option}</span>
                      </label>
                    ))}
                    {config.allowCustom !== false && (
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          showCustomInput
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name="modal-select"
                          checked={showCustomInput}
                          onChange={() => {
                            setShowCustomInput(true);
                            setSelectedOption('');
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700 dark:text-slate-300">Other (specify)</span>
                      </label>
                    )}
                  </div>
                  {showCustomInput && (
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={config.placeholder || 'Enter custom reason...'}
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {config.children}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
              {config.type === 'alert' ? (
                <button
                  onClick={handleConfirm}
                  className={getButtonClasses('primary')}
                  autoFocus
                >
                  OK
                </button>
              ) : config.type === 'confirm' ? (
                <>
                  <button
                    onClick={handleCancel}
                    className={getButtonClasses('secondary')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={getButtonClasses('primary')}
                    autoFocus
                  >
                    Confirm
                  </button>
                </>
              ) : config.type === 'prompt' ? (
                <>
                  <button
                    onClick={handleCancel}
                    className={getButtonClasses('secondary')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className={getButtonClasses('primary')}
                  >
                    OK
                  </button>
                </>
              ) : config.type === 'select' ? (
                <>
                  <button
                    onClick={handleCancel}
                    className={getButtonClasses('secondary')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedOption && !showCustomInput || (showCustomInput && !inputValue)}
                    className={`${getButtonClasses('primary')} disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    Confirm
                  </button>
                </>
              ) : config.buttons ? (
                config.buttons.map((btn, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      btn.onClick?.();
                      onClose();
                    }}
                    className={getButtonClasses(btn.variant)}
                  >
                    {btn.label}
                  </button>
                ))
              ) : (
                <button
                  onClick={handleConfirm}
                  className={getButtonClasses('primary')}
                >
                  OK
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

// Modal Provider
export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: any) => void) | null>(null);

  const showAlert = useCallback((title: string, message: string): Promise<void> => {
    return new Promise((resolve) => {
      setConfig({ type: 'alert', title, message });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const showConfirm = useCallback((title: string, message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfig({ type: 'confirm', title, message });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const showPrompt = useCallback((
    title: string,
    message: string,
    defaultValue?: string,
    placeholder?: string
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setConfig({ type: 'prompt', title, message, defaultValue, placeholder });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const showSelect = useCallback((
    title: string,
    message: string,
    options: string[],
    allowCustom: boolean = true
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      setConfig({ type: 'select', title, message, options, allowCustom });
      setResolveRef(() => resolve);
      setIsOpen(true);
    });
  }, []);

  const showModal = useCallback((modalConfig: ModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setConfig(null);
    setResolveRef(null);
  }, []);

  const handleResult = useCallback((result: any) => {
    if (resolveRef) {
      resolveRef(result);
    }
  }, [resolveRef]);

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt, showSelect, showModal, closeModal }}>
      {children}
      <Modal
        isOpen={isOpen}
        config={config}
        onClose={closeModal}
        onResult={handleResult}
      />
    </ModalContext.Provider>
  );
};

export default Modal;
