import { useStore } from '../store/useStore';
import { jsPDF } from 'jspdf';

interface LineItem {
  label: string;
  amount: number;
  gst?: number;
}

export function generateInvoice(docketId: string) {
  const doc = new jsPDF();
  const dockets = useStore.getState().dockets;
  const docket = dockets.find(d => d.id === docketId);
  if (!docket) return null;

  const lineItems: LineItem[] = [
    { label: 'Service Fee', amount: docket.serviceFee || 0, gst: 18 },
  ];
  if (docket.materialCosts && docket.materialCosts > 0) {
    lineItems.push({ label: 'Material Costs', amount: docket.materialCosts, gst: 18 });
  }
  if (docket.usedPart) {
    lineItems.push({ label: `Part: ${docket.usedPart}`, amount: 0 });
  }

  const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
  const gstTotal = lineItems.reduce((s, i) => s + (i.gst ? i.amount * i.gst / 100 : 0), 0);
  const total = subtotal + gstTotal;
  const paid = docket.amountReceived || 0;
  const due = total - paid;

  doc.setFontSize(20);
  doc.text('INVOICE', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`Invoice #: INV-${docketId.slice(0, 8).toUpperCase()}`, 14, 35);
  doc.text(`Date: ${new Date(docket.createdAt || docket.date).toLocaleDateString()}`, 14, 42);
  doc.text(`Customer: ${docket.customer}`, 14, 49);
  doc.text(`Address: ${docket.address}`, 14, 56);

  doc.setDrawColor(79, 70, 229);
  doc.line(14, 62, 196, 62);

  let y = 72;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Description', 14, y);
  doc.text('Amount', 160, y);
  doc.text('GST', 180, y);
  doc.setFont('helvetica', 'normal');
  y += 8;

  for (const item of lineItems) {
    doc.text(item.label, 14, y);
    doc.text(`₹${item.amount.toFixed(2)}`, 160, y);
    doc.text(item.gst ? `${item.gst}%` : '-', 180, y);
    y += 7;
  }

  y += 5;
  doc.line(14, y, 196, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`Subtotal:`, 130, y);
  doc.text(`₹${subtotal.toFixed(2)}`, 160, y);
  y += 6;
  doc.text(`GST @18%:`, 130, y);
  doc.text(`₹${gstTotal.toFixed(2)}`, 160, y);
  y += 6;
  doc.setFontSize(12);
  doc.text(`TOTAL:`, 130, y);
  doc.text(`₹${total.toFixed(2)}`, 160, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(22, 163, 74);
  doc.text(`Paid: ₹${paid.toFixed(2)}`, 130, y);
  y += 6;
  if (due > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text(`Due: ₹${due.toFixed(2)}`, 130, y);
  } else {
    doc.text('PAID IN FULL', 150, y);
  }

  return doc;
}

export function downloadInvoice(docketId: string) {
  const doc = generateInvoice(docketId);
  if (!doc) return;
  doc.save(`invoice-${docketId.slice(0, 8)}.pdf`);
}
