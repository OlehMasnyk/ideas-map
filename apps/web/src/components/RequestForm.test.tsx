import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@ideas-map/shared';
import { formatRadius, RequestForm, type RequestDraft } from './RequestForm';

const categories: Category[] = [
  { id: 1, slug: 'cafe', name: 'Cafe', icon: 'C' },
  { id: 2, slug: 'gym', name: 'Gym', icon: 'G' },
];

const draft = (patch: Partial<RequestDraft> = {}): RequestDraft => ({
  lat: null,
  lng: null,
  category: 'cafe',
  radiusMeters: 500,
  comment: '',
  ...patch,
});

function renderForm(d: RequestDraft, overrides: Partial<Parameters<typeof RequestForm>[0]> = {}) {
  const props = {
    draft: d,
    categories,
    onChange: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    onCancel: vi.fn(),
    ...overrides,
  };
  render(<RequestForm {...props} />);
  return props;
}

describe('formatRadius', () => {
  it('formats meters and kilometers', () => {
    expect(formatRadius(500)).toBe('500 m');
    expect(formatRadius(1500)).toBe('1.5 km');
  });
});

describe('RequestForm', () => {
  it('asks for a pin and disables submit until one is placed', () => {
    renderForm(draft());
    expect(screen.getByText('Click on the map to drop a pin.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
  });

  it('reports category changes', async () => {
    const props = renderForm(draft({ lat: 1, lng: 2 }));
    await userEvent.click(screen.getByLabelText(/Gym/));
    expect(props.onChange).toHaveBeenCalledWith({ category: 'gym' });
  });

  it('submits when a pin is placed', async () => {
    const props = renderForm(draft({ lat: 52.5, lng: 13.4 }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(props.onSubmit).toHaveBeenCalledOnce();
  });

  it('shows server errors', async () => {
    renderForm(draft({ lat: 52.5, lng: 13.4 }), {
      onSubmit: vi.fn().mockRejectedValue(new Error('Limit reached')),
    });
    await userEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Limit reached');
  });
});
