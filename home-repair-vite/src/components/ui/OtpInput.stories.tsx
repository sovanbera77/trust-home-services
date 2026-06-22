import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import OtpInput from './OtpInput';

const meta: Meta<typeof OtpInput> = {
  title: 'UI/OtpInput',
  component: OtpInput,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OtpInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return <OtpInput length={6} value={value} onChange={setValue} />;
  },
};

export const Length4: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return <OtpInput length={4} value={value} onChange={setValue} />;
  },
};

export const PartiallyFilled: Story = {
  render: () => {
    const [value, setValue] = useState('12');
    return <OtpInput length={6} value={value} onChange={setValue} />;
  },
};
