import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OtpInput from './OtpInput';

describe('OtpInput', () => {
  it('renders correct number of boxes', () => {
    const { container } = render(<OtpInput length={6} value="" onChange={() => {}} />);
    expect(container.querySelectorAll('input')).toHaveLength(6);
  });

  it('calls onChange with digit on input', async () => {
    const onChange = vi.fn();
    render(<OtpInput length={4} value="" onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    await userEvent.type(inputs[0], '5');
    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('backspace on filled digit clears it', () => {
    const onChange = vi.fn();
    const { container } = render(<OtpInput length={6} value="12" onChange={onChange} />);
    const inputs = container.querySelectorAll<HTMLInputElement>('input');
    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith('1');
  });

  it('backspace on empty digit clears previous', () => {
    const onChange = vi.fn();
    const { container } = render(<OtpInput length={6} value="1" onChange={onChange} />);
    const inputs = container.querySelectorAll<HTMLInputElement>('input');
    inputs[1].focus();
    fireEvent.keyDown(inputs[1], { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith('');
  });
});
