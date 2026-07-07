/**
 * Payroll Computation Engine
 *
 * Computes payroll for staff including:
 * - Basic salary
 * - Allowances (housing, transport, medical, etc.)
 * - Deductions (tax, pension, insurance, advances)
 * - Bonus and overtime processing
 * - Net pay calculation
 *
 * Supports configurable tax brackets and pension rates per school.
 */

export interface Allowance {
  name: string;
  amount: number;
  taxable: boolean;
}

export interface Deduction {
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

export interface PayrollConfig {
  // Pension contribution rate (e.g., 0.075 = 7.5%)
  pensionRate: number;
  // Tax brackets: [{ upTo: number, rate: number }] - progressive
  taxBrackets: { upTo: number; rate: number }[];
  // Housing allowance rate (e.g., 0.1 = 10% of basic)
  housingAllowanceRate: number;
  // Transport allowance rate
  transportAllowanceRate: number;
}

export interface PayrollComputation {
  basicSalary: number;
  allowances: Allowance[];
  deductions: Deduction[];
  grossPay: number;
  taxableIncome: number;
  taxAmount: number;
  pensionAmount: number;
  totalDeductions: number;
  bonus: number;
  overtime: number;
  netPay: number;
}

/**
 * Default payroll configuration (Nigeria-style PAYE).
 * Schools can override via their settings.
 */
export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  pensionRate: 0.075, // 7.5% pension
  taxBrackets: [
    { upTo: 300000, rate: 0.07 },     // First 300k: 7%
    { upTo: 600000, rate: 0.11 },     // Next 300k: 11%
    { upTo: 1100000, rate: 0.15 },    // Next 500k: 15%
    { upTo: 1600000, rate: 0.19 },    // Next 500k: 19%
    { upTo: 3200000, rate: 0.21 },    // Next 1.6M: 21%
    { upTo: Infinity, rate: 0.24 },   // Above 3.2M: 24%
  ],
  housingAllowanceRate: 0.1,  // 10% of basic
  transportAllowanceRate: 0.05, // 5% of basic
};

/**
 * Computes payroll for a single staff member.
 *
 * @param basicSalary - Monthly basic salary
 * @param config - Payroll configuration (tax brackets, pension rate)
 * @param customAllowances - Additional allowances beyond default
 * @param customDeductions - Additional deductions beyond tax/pension
 * @param bonus - Bonus amount for this period
 * @param overtimeHours - Overtime hours worked
 * @param overtimeRate - Hourly overtime rate
 */
export function computePayroll(
  basicSalary: number,
  config: PayrollConfig = DEFAULT_PAYROLL_CONFIG,
  customAllowances: Allowance[] = [],
  customDeductions: Deduction[] = [],
  bonus: number = 0,
  overtimeHours: number = 0,
  overtimeRate: number = 0
): PayrollComputation {
  // Standard allowances
  const housingAllowance: Allowance = {
    name: 'Housing',
    amount: Math.round(basicSalary * config.housingAllowanceRate),
    taxable: false,
  };
  const transportAllowance: Allowance = {
    name: 'Transport',
    amount: Math.round(basicSalary * config.transportAllowanceRate),
    taxable: false,
  };

  const allAllowances = [housingAllowance, transportAllowance, ...customAllowances];

  // Overtime pay
  const overtimePay = overtimeHours * overtimeRate;

  // Gross pay = basic + allowances + bonus + overtime
  const grossPay = basicSalary + allAllowances.reduce((s, a) => s + a.amount, 0) + bonus + overtimePay;

  // Taxable income = basic + taxable allowances (non-taxable like housing/transport excluded)
  const taxableIncome = basicSalary + allAllowances
    .filter(a => a.taxable)
    .reduce((s, a) => s + a.amount, 0) + bonus + overtimePay;

  // Pension (on basic salary + housing + transport - standard practice)
  const pensionableIncome = basicSalary + housingAllowance.amount + transportAllowance.amount;
  const pensionAmount = Math.round(pensionableIncome * config.pensionRate);

  // Tax (progressive, computed on taxable income minus pension)
  const taxAmount = computeProgressiveTax(taxableIncome - pensionAmount, config.taxBrackets);

  // Custom deductions
  let customDeductionTotal = 0;
  for (const ded of customDeductions) {
    if (ded.type === 'percentage') {
      customDeductionTotal += Math.round(basicSalary * (ded.amount / 100));
    } else {
      customDeductionTotal += ded.amount;
    }
  }

  const totalDeductions = taxAmount + pensionAmount + customDeductionTotal;
  const netPay = grossPay - totalDeductions;

  return {
    basicSalary,
    allowances: allAllowances,
    deductions: customDeductions,
    grossPay,
    taxableIncome,
    taxAmount,
    pensionAmount,
    totalDeductions,
    bonus,
    overtime: overtimePay,
    netPay,
  };
}

/**
 * Computes progressive tax using brackets.
 */
function computeProgressiveTax(income: number, brackets: { upTo: number; rate: number }[]): number {
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (income <= previousLimit) break;
    const taxableInBracket = Math.min(income, bracket.upTo) - previousLimit;
    if (taxableInBracket > 0) {
      tax += Math.round(taxableInBracket * bracket.rate);
    }
    previousLimit = bracket.upTo;
  }

  return tax;
}

/**
 * Generates a bank transfer file (CSV format) for payroll disbursement.
 * Format: Account Name, Account Number, Bank, Amount, Reference
 */
export function generateBankTransferFile(
  payrollRecords: { staffName: string; accountNumber: string; bankName: string; netPay: number; reference: string }[]
): string {
  const header = 'Account Name,Account Number,Bank Name,Amount,Reference\n';
  const rows = payrollRecords.map(r =>
    `"${r.staffName}","${r.accountNumber}","${r.bankName}",${r.netPay},"${r.reference}"`
  ).join('\n');
  return header + rows;
}

/**
 * Generates a payslip object for display/PDF.
 */
export function generatePayslip(
  staffName: string,
  staffId: string,
  month: string,
  year: number,
  computation: PayrollComputation
): {
  staffName: string;
  staffId: string;
  month: string;
  year: number;
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  grossPay: number;
  totalDeductions: number;
  netPay: number;
} {
  const earnings = [
    { name: 'Basic Salary', amount: computation.basicSalary },
    ...computation.allowances.map(a => ({ name: a.name + ' Allowance', amount: a.amount })),
  ];
  if (computation.bonus > 0) earnings.push({ name: 'Bonus', amount: computation.bonus });
  if (computation.overtime > 0) earnings.push({ name: 'Overtime', amount: computation.overtime });

  const deductions = [
    { name: 'Tax (PAYE)', amount: computation.taxAmount },
    { name: 'Pension', amount: computation.pensionAmount },
    ...computation.deductions.map(d => ({
      name: d.name,
      amount: d.type === 'percentage' ? Math.round(computation.basicSalary * (d.amount / 100)) : d.amount,
    })),
  ];

  return {
    staffName,
    staffId,
    month,
    year,
    earnings,
    deductions,
    grossPay: computation.grossPay,
    totalDeductions: computation.totalDeductions,
    netPay: computation.netPay,
  };
}
