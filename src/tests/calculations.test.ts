import { describe, it, expect } from 'vitest';

describe('Grade Calculation Logic', () => {
  // Replicate the grade scale used in marks.astro
  const gradeScale = [
    { min: 90, grade: 'A+', remark: 'Excellent' },
    { min: 80, grade: 'A', remark: 'Very Good' },
    { min: 70, grade: 'B', remark: 'Good' },
    { min: 60, grade: 'C', remark: 'Satisfactory' },
    { min: 50, grade: 'D', remark: 'Pass' },
    { min: 0, grade: 'F', remark: 'Fail' },
  ];

  function computeGrade(pct: number) {
    return gradeScale.find(g => pct >= g.min) || gradeScale[gradeScale.length - 1];
  }

  it('should return A+ for 90%+', () => {
    expect(computeGrade(95).grade).toBe('A+');
    expect(computeGrade(90).grade).toBe('A+');
    expect(computeGrade(100).grade).toBe('A+');
  });

  it('should return A for 80-89%', () => {
    expect(computeGrade(85).grade).toBe('A');
    expect(computeGrade(80).grade).toBe('A');
    expect(computeGrade(89).grade).toBe('A');
  });

  it('should return B for 70-79%', () => {
    expect(computeGrade(75).grade).toBe('B');
    expect(computeGrade(70).grade).toBe('B');
  });

  it('should return C for 60-69%', () => {
    expect(computeGrade(65).grade).toBe('C');
    expect(computeGrade(60).grade).toBe('C');
  });

  it('should return D for 50-59%', () => {
    expect(computeGrade(55).grade).toBe('D');
    expect(computeGrade(50).grade).toBe('D');
  });

  it('should return F for below 50%', () => {
    expect(computeGrade(49).grade).toBe('F');
    expect(computeGrade(0).grade).toBe('F');
  });

  it('should compute percentage correctly', () => {
    const marks = 45;
    const totalMarks = 60;
    const pct = (marks / totalMarks) * 100;
    expect(pct).toBe(75);
    expect(computeGrade(pct).grade).toBe('B');
  });
});

describe('Library Fine Calculation', () => {
  // Fine rate: ₦50/day
  const FINE_PER_DAY = 50;

  function calculateFine(dueDate: string, returnDate: Date): number {
    const due = new Date(dueDate);
    if (returnDate <= due) return 0;
    const days = Math.floor((returnDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return days * FINE_PER_DAY;
  }

  it('should return 0 fine if returned on time', () => {
    const due = '2026-01-15';
    const returned = new Date('2026-01-15');
    expect(calculateFine(due, returned)).toBe(0);
  });

  it('should return 0 fine if returned early', () => {
    const due = '2026-01-15';
    const returned = new Date('2026-01-10');
    expect(calculateFine(due, returned)).toBe(0);
  });

  it('should calculate 1 day fine', () => {
    const due = '2026-01-15';
    const returned = new Date('2026-01-16');
    expect(calculateFine(due, returned)).toBe(50);
  });

  it('should calculate 7 day fine', () => {
    const due = '2026-01-15';
    const returned = new Date('2026-01-22');
    expect(calculateFine(due, returned)).toBe(350);
  });

  it('should calculate 30 day fine', () => {
    const due = '2026-01-15';
    const returned = new Date('2026-02-14');
    expect(calculateFine(due, returned)).toBe(1500);
  });
});

describe('Invoice Status Computation', () => {
  function computeInvoiceStatus(amount: number, discount: number, fine: number, paidAmount: number): string {
    const total = amount - discount + fine;
    if (paidAmount >= total) return 'paid';
    if (paidAmount > 0) return 'partial';
    return 'pending';
  }

  it('should return paid when fully paid', () => {
    expect(computeInvoiceStatus(1000, 0, 0, 1000)).toBe('paid');
    expect(computeInvoiceStatus(1000, 100, 50, 950)).toBe('paid');
  });

  it('should return partial when partially paid', () => {
    expect(computeInvoiceStatus(1000, 0, 0, 500)).toBe('partial');
    expect(computeInvoiceStatus(1000, 100, 0, 500)).toBe('partial');
  });

  it('should return pending when nothing paid', () => {
    expect(computeInvoiceStatus(1000, 0, 0, 0)).toBe('pending');
  });

  it('should handle overpayment', () => {
    expect(computeInvoiceStatus(1000, 0, 0, 1200)).toBe('paid');
  });
});
