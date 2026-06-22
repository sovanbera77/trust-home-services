import { useStore } from '../store/useStore';
import type { Docket, Attendance } from './types';

export function exportCSV(headers: string[], rows: string[][], filename: string) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDockets() {
  const dockets = useStore.getState().dockets;
  const headers = ['ID', 'Customer', 'Title', 'Status', 'Service Fee', 'Amount Received', 'Date', 'Completed Date'];
  const rows = dockets.map((d: Docket) => [
    d.id, d.customer, d.title, d.status, String(d.serviceFee), String(d.amountReceived || 0),
    new Date(d.date).toLocaleDateString(), d.completedDate ? new Date(d.completedDate).toLocaleDateString() : '',
  ]);
  exportCSV(headers, rows, 'dockets');
}

export function exportRevenue() {
  const dockets = useStore.getState().dockets;
  const headers = ['Customer', 'Title', 'Service Fee', 'Material Costs', 'Amount Received', 'Payment Method', 'Date'];
  const rows = dockets.filter((d: Docket) => (d.amountReceived || 0) > 0).map((d: Docket) => [
    d.customer, d.title, String(d.serviceFee), String(d.materialCosts), String(d.amountReceived || 0),
    d.paymentMethod || '', new Date(d.date).toLocaleDateString(),
  ]);
  exportCSV(headers, rows, 'revenue');
}

export function exportAttendance() {
  const attendance = useStore.getState().attendance;
  const headers = ['User ID', 'Type', 'Lat', 'Lng', 'Date'];
  const rows = attendance.map((a: Attendance) => [
    a.user_id, a.type, String(a.lat ?? ''), String(a.lng ?? ''), new Date(a.created_at).toLocaleString(),
  ]);
  exportCSV(headers, rows, 'attendance');
}
