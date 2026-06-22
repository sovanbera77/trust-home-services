import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the status text', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('pending')).toBeInTheDocument();
  });

  it('applies correct color class for each status', () => {
    const { container, rerender } = render(<StatusBadge status="pending" />);
    expect(container.firstChild).toHaveClass('bg-yellow-500/10');

    rerender(<StatusBadge status="assigned" />);
    expect(container.firstChild).toHaveClass('bg-blue-500/10');

    rerender(<StatusBadge status="completed" />);
    expect(container.firstChild).toHaveClass('bg-green-500/10');

    rerender(<StatusBadge status="rejected" />);
    expect(container.firstChild).toHaveClass('bg-red-500/10');
  });

  it('handles unknown status gracefully', () => {
    const { container } = render(<StatusBadge status="unknown" />);
    expect(container.firstChild).toHaveTextContent('unknown');
  });
});
