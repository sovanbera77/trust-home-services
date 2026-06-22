import type { Meta, StoryObj } from '@storybook/react-vite';
import StatusBadge from './StatusBadge';

const meta: Meta<typeof StatusBadge> = {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['pending', 'assigned', 'completed', 'rejected'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusBadge>;

export const Pending: Story = { args: { status: 'pending' } };
export const Assigned: Story = { args: { status: 'assigned' } };
export const Completed: Story = { args: { status: 'completed' } };
export const Rejected: Story = { args: { status: 'rejected' } };
export const AllStatuses: Story = {
  render: () => (
    <div className="flex gap-2">
      <StatusBadge status="pending" />
      <StatusBadge status="assigned" />
      <StatusBadge status="completed" />
      <StatusBadge status="rejected" />
    </div>
  ),
};
