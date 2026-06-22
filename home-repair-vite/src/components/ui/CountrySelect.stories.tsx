import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import CountrySelect from './CountrySelect';

const meta: Meta<typeof CountrySelect> = {
  title: 'UI/CountrySelect',
  component: CountrySelect,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CountrySelect>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('91');
    return <CountrySelect value={value} onChange={setValue} />;
  },
};

export const USA: Story = {
  render: () => {
    const [value, setValue] = useState('1');
    return <CountrySelect value={value} onChange={setValue} />;
  },
};
