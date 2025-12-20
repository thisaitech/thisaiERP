
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Settings from './Settings';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'test-uid' },
    reauthenticate: vi.fn(),
  }),
}));

vi.mock('../contexts/CompanyContext', () => ({
  useCompany: () => ({
    company: null,
    loading: true,
  }),
}));

vi.mock('../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: {
      settings: {
        general: 'General',
        languageLabel: 'Language / மொழி',
        companyInfo: 'Company Information',
        transaction: 'Transaction',
        invoicePrint: 'Invoice Print',
        taxesAndGst: 'Taxes & GST',
        transactionalSms: 'Transactional SMS',
        reminders: 'Reminders',
        partySettings: 'Party Settings',
        itemSettings: 'Item Settings',
        invoiceTable: 'Invoice Table',
        offlineAndSync: 'Offline & Sync',
        razorpayPayments: 'Razorpay Payments',
        userManagement: 'User Management',
      },
      common: {
        loading: 'Loading...',
      }
    }
  }),
}));

vi.mock('react-hot-toast', () => ({
  success: vi.fn(),
  error: vi.fn(),
}));

describe('Settings Page', () => {
  it('renders the settings page with a loading state', () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    // Check for the main heading
    expect(screen.getByText('General')).toBeInTheDocument();

    // As the company data is loading, it should show a loading indicator
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
