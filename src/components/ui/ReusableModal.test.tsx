// src/components/ui/ReusableModal.test.tsx
import { render, screen } from '@testing-library/react';
import { ReusableModal } from './ReusableModal';
import React from 'react';
import '@testing-library/jest-dom';

describe('ReusableModal', () => {
  it('renders the modal with title and children when open', () => {
    render(
      <ReusableModal isOpen={true} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </ReusableModal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('does not render the modal when closed', () => {
    render(
      <ReusableModal isOpen={false} onClose={() => {}} title="Test Modal">
        <div>Modal Content</div>
      </ReusableModal>
    );

    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });
});
