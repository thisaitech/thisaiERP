import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MobileFilterChips from '../MobileFilterChips'
import MobilePageScaffold from '../MobilePageScaffold'
import MobileSearchBar from '../MobileSearchBar'

describe('Mobile UI primitives', () => {
  it('renders page scaffold title and children', () => {
    render(
      <MobilePageScaffold title="Admissions" subtitle="Mobile first">
        <div>content</div>
      </MobilePageScaffold>
    )

    expect(screen.getByText('Admissions')).toBeInTheDocument()
    expect(screen.getByText('Mobile first')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('changes chip selection and search text', () => {
    const onChange = vi.fn()
    const onSearch = vi.fn()

    render(
      <>
        <MobileFilterChips
          items={[
            { id: 'all', label: 'All' },
            { id: 'paid', label: 'Paid', count: 2 },
          ]}
          activeId="all"
          onChange={onChange}
        />
        <MobileSearchBar value="" onChange={onSearch} placeholder="Search admissions" />
      </>
    )

    fireEvent.click(screen.getByText('Paid'))
    expect(onChange).toHaveBeenCalledWith('paid')

    fireEvent.change(screen.getByPlaceholderText('Search admissions'), { target: { value: 'adm' } })
    expect(onSearch).toHaveBeenCalledWith('adm')
  })
})

