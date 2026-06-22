import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const INVOICES_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'invoices');

if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

export async function generateInvoicePdf(invoice: {
  invoiceNo: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  items: { description: string; amount: number }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod?: string;
  date: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const filename = `invoice-${invoice.invoiceNo}.pdf`;
    const filePath = path.join(INVOICES_DIR, filename);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);

    doc.pipe(stream);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Trust Home Services', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('123, Service Road, Bangalore - 560001', { align: 'center' });
    doc.text('Phone: +91-9876543210 | Email: billing@trusthomeservices.com', { align: 'center' });
    doc.moveDown();

    // Invoice title
    doc.fontSize(18).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();

    // Invoice details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice No: ${invoice.invoiceNo}`);
    doc.text(`Date: ${invoice.date}`);
    doc.text(`Customer: ${invoice.customerName}`);
    doc.text(`Mobile: ${invoice.customerMobile}`);
    doc.text(`Address: ${invoice.customerAddress}`);
    doc.moveDown(2);

    // Table header
    const tableTop = doc.y;
    const col1 = 50, col2 = 300, col3 = 450, col4 = 500;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Description', col1, tableTop);
    doc.text('Amount', col3, tableTop);
    doc.moveDown(0.5);

    // Line under header
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    for (const item of invoice.items) {
      doc.text(item.description, col1, doc.y, { width: 240 });
      doc.text(`₹${item.amount.toFixed(2)}`, col3, doc.y - 12);
      doc.moveDown(0.3);
    }

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Totals
    const totalsY = doc.y;
    doc.font('Helvetica');
    doc.text('Subtotal:', col1, totalsY);
    doc.text(`₹${invoice.subtotal.toFixed(2)}`, col3, totalsY);
    doc.text('Tax (18%):', col1, doc.y + 18);
    doc.text(`₹${invoice.tax.toFixed(2)}`, col3, doc.y - 12);
    doc.font('Helvetica-Bold');
    doc.text('Total:', col1, doc.y + 18);
    doc.fontSize(14).text(`₹${invoice.total.toFixed(2)}`, col3, doc.y - 18);

    // Payment info
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Payment Method: ${invoice.paymentMethod || 'Online'}`);
    doc.text(`Status: ${invoice.paymentMethod ? 'Paid' : 'Pending'}`);

    // Footer
    doc.moveDown(3);
    doc.fontSize(8).fillColor('#94a3b8').text('Thank you for choosing Trust Home Services!', { align: 'center' });
    doc.text('This is a computer-generated invoice.', { align: 'center' });

    doc.end();

    stream.on('finish', () => resolve(filePath));
    stream.on('error', reject);
  });
}

export function getInvoiceUrl(filename: string): string {
  return `/uploads/invoices/${filename}`;
}
