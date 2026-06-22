import { jsPDF } from 'jspdf';
import AdmZip from 'adm-zip';

interface PayslipData {
  id: number;
  month: number;
  year: number;
  employee_name: string;
  employee_code: string;
  department_name?: string;
  pan_number?: string;
  bank_name?: string;
  bank_account_no?: string;
  ifsc_code?: string;
  uan_number?: string;
  pf_number?: string;
  gross_salary: number;
  earnings: number;
  bonus: number;
  commission: number;
  reimbursement: number;
  tds: number;
  provident_fund: number;
  professional_tax: number;
  other_deductions: number;
  deductions: number;
  net_pay: number;
  total_days: number;
  paid_days: number;
  lop_days: number;
}

const MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmt(amount: number): string {
  return '\u20B9 ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function generatePayslip(item: PayslipData): Buffer {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = 210;
  const lm = 15;
  const cw = pw - lm - 15;
  let y = 20;

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ACME Corp', pw / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Business Avenue, Corporate Zone, City - 400001', pw / 2, y, { align: 'center' });
  y += 5;
  doc.text('GST: 27ABCDE1234F1Z5 | Tel: +91-22-12345678', pw / 2, y, { align: 'center' });
  y += 12;

  doc.setDrawColor(41, 128, 185);
  doc.setFillColor(41, 128, 185);
  doc.rect(lm, y - 4, cw, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`PAYSLIP - ${MONTHS[item.month]} ${item.year}`, pw / 2, y + 3, { align: 'center' });
  y += 16;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Details', lm, y);
  y += 2;
  doc.setDrawColor(200);
  doc.line(lm, y, pw - 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const empRows = [
    ['Employee Name', item.employee_name, 'Employee Code', item.employee_code],
    ['Department', item.department_name || '-', 'PAN Number', item.pan_number || '-'],
    ['Bank Name', item.bank_name || '-', 'Account No', item.bank_account_no || '-'],
    ['IFSC Code', item.ifsc_code || '-', 'UAN Number', item.uan_number || '-'],
  ];
  empRows.forEach(r => {
    doc.setFont('helvetica', 'bold');
    doc.text(r[0], lm, y);
    doc.setFont('helvetica', 'normal');
    doc.text(r[1], lm + 70, y);
    doc.setFont('helvetica', 'bold');
    doc.text(r[2], lm + 105, y);
    doc.setFont('helvetica', 'normal');
    doc.text(r[3], lm + 160, y);
    y += 6;
  });
  y += 4;

  const ew = cw * 0.5 - 2;
  const dw = cw * 0.5 - 2;
  const ex = lm;
  const dx = lm + ew + 4;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings', ex, y);
  doc.text('Deductions', dx, y);
  y += 3;
  doc.setDrawColor(200);
  doc.line(ex, y, ex + ew, y);
  doc.line(dx, y, dx + dw, y);
  y += 5;

  const earnings: [string, number][] = [
    ['Basic + HRA', item.earnings],
    ['Bonus', item.bonus],
    ['Commission', item.commission],
    ['Reimbursement', item.reimbursement],
  ];
  const deductions: [string, number][] = [
    ['Provident Fund', item.provident_fund],
    ['Professional Tax', item.professional_tax],
    ['TDS', item.tds],
    ['Other Deductions', item.other_deductions],
  ];

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const maxRows = Math.max(earnings.length, deductions.length);
  for (let i = 0; i < maxRows; i++) {
    if (i < earnings.length) {
      doc.text(earnings[i][0], ex + 2, y);
      doc.text(fmt(earnings[i][1]), ex + ew - 2, y, { align: 'right' });
    }
    if (i < deductions.length) {
      doc.text(deductions[i][0], dx + 2, y);
      doc.text(fmt(deductions[i][1]), dx + dw - 2, y, { align: 'right' });
    }
    y += 6;
  }
  y += 2;
  doc.line(ex, y, ex + ew, y);
  doc.line(dx, y, dx + dw, y);
  y += 5;

  const totalEarnings = item.earnings + item.bonus + item.commission + item.reimbursement;
  const totalDeductions = item.provident_fund + item.professional_tax + item.tds + item.other_deductions;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Total Earnings', ex + 2, y);
  doc.text(fmt(totalEarnings), ex + ew - 2, y, { align: 'right' });
  doc.text('Total Deductions', dx + 2, y);
  doc.text(fmt(totalDeductions), dx + dw - 2, y, { align: 'right' });
  y += 12;

  doc.setDrawColor(41, 128, 185);
  doc.setFillColor(41, 128, 185);
  doc.rect(lm, y - 4, cw, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Net Pay: ' + fmt(item.net_pay), pw / 2, y + 4, { align: 'center' });
  y += 18;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Working Days: ${item.total_days}  |  Paid Days: ${item.paid_days}  |  LOP: ${item.lop_days}`, lm, y);
  y += 10;

  doc.setFontSize(8);
  doc.setTextColor(128);
  doc.text('This is a computer-generated payslip and does not require a signature.', pw / 2, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export function generateBulkPayslips(items: PayslipData[]): Buffer {
  const zip = new AdmZip();
  items.forEach(item => {
    const pdf = generatePayslip(item);
    const name = `${item.employee_code}_${MONTHS[item.month]}_${item.year}.pdf`;
    zip.addFile(name, pdf);
  });
  return Buffer.from(zip.toBuffer());
}
