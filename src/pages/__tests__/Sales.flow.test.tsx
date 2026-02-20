import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Sales from '../Sales'

const createPartyMock = vi.fn()
const updatePartyMock = vi.fn()
const getPartiesMock = vi.fn()
const getItemsMock = vi.fn()
const createInvoiceMock = vi.fn()
const updateInvoiceMock = vi.fn()
const deleteInvoiceMock = vi.fn()
const getInvoicesMock = vi.fn()

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    userData: {
      uid: 'u1',
      displayName: 'Admin',
    },
  }),
}))

vi.mock('../../services/partyService', () => ({
  createParty: (...args: any[]) => createPartyMock(...args),
  updateParty: (...args: any[]) => updatePartyMock(...args),
  getParties: (...args: any[]) => getPartiesMock(...args),
}))

vi.mock('../../services/itemService', () => ({
  getItems: (...args: any[]) => getItemsMock(...args),
}))

vi.mock('../../services/invoiceService', () => ({
  createInvoice: (...args: any[]) => createInvoiceMock(...args),
  updateInvoice: (...args: any[]) => updateInvoiceMock(...args),
  deleteInvoice: (...args: any[]) => deleteInvoiceMock(...args),
  getInvoices: (...args: any[]) => getInvoicesMock(...args),
}))

describe('Sales admissions flows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1200 })
    getItemsMock.mockResolvedValue([{ id: 'c1', name: 'spoken english', sellingPrice: 5000, unit: 'Course' }])
    getPartiesMock.mockResolvedValue([])
    getInvoicesMock.mockResolvedValue([])
    createPartyMock.mockResolvedValue({ id: 'p1', name: 'muthu' })
    createInvoiceMock.mockResolvedValue({ id: 'i1' })
    updateInvoiceMock.mockResolvedValue(true)
    updatePartyMock.mockResolvedValue(true)
    deleteInvoiceMock.mockResolvedValue(true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('creates a new admission and linked student', async () => {
    render(<Sales />)
    fireEvent.click(await screen.findByText('New Admission'))

    const studentInput = screen.getByPlaceholderText('Search student...')
    fireEvent.change(studentInput, { target: { value: 'muthu' } })

    const select = screen.getByDisplayValue('Select course...')
    fireEvent.change(select, { target: { value: 'c1' } })

    fireEvent.click(screen.getByText('Save Admission'))

    await waitFor(() => expect(createPartyMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(createInvoiceMock).toHaveBeenCalledTimes(1))
    expect(createInvoiceMock.mock.calls[0][0]).toMatchObject({
      type: 'sale',
      partyId: 'p1',
    })
  })

  it('edits an admission and updates existing student without creating a new one', async () => {
    getPartiesMock.mockResolvedValue([{ id: 'p1', name: 'old', companyName: 'old', phone: '9999999999' }])
    getInvoicesMock.mockResolvedValue([
      {
        id: 'i1',
        invoiceNumber: 'ADM-01',
        invoiceDate: '2026-02-20',
        partyId: 'p1',
        partyName: 'old',
        phone: '9999999999',
        paidAmount: 1000,
        total: 5000,
        status: 'partial',
        items: [{ itemId: 'c1', itemName: 'spoken english', quantity: 1, rate: 5000, amount: 5000 }],
      },
    ])

    render(<Sales />)
    fireEvent.click(await screen.findByTitle('Edit'))

    const studentInput = screen.getByDisplayValue('old')
    fireEvent.change(studentInput, { target: { value: 'new name' } })

    fireEvent.click(screen.getByText('Update Admission'))

    await waitFor(() => expect(updateInvoiceMock).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(updatePartyMock).toHaveBeenCalledTimes(1))
    expect(createPartyMock).not.toHaveBeenCalled()
  })

  it('deletes admission from actions', async () => {
    getInvoicesMock.mockResolvedValue([
      { id: 'i1', invoiceNumber: 'ADM-02', invoiceDate: '2026-02-20', partyName: 'satya', total: 5000, paidAmount: 0 },
    ])

    render(<Sales />)
    fireEvent.click(await screen.findByTitle('Delete'))

    await waitFor(() => expect(deleteInvoiceMock).toHaveBeenCalledWith('i1'))
  })
})

