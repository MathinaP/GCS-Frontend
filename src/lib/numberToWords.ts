const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];

const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function inWords(num: number): string {
  if (num === 0) return 'Zero';
  let result = '';

  if (num >= 10_000_000) {
    result += inWords(Math.floor(num / 10_000_000)) + ' Crore ';
    num %= 10_000_000;
  }
  if (num >= 100_000) {
    result += inWords(Math.floor(num / 100_000)) + ' Lakh ';
    num %= 100_000;
  }
  if (num >= 1_000) {
    result += inWords(Math.floor(num / 1_000)) + ' Thousand ';
    num %= 1_000;
  }
  if (num >= 100) {
    result += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  if (num > 0) {
    if (num < 20) {
      result += ones[num];
    } else {
      result += tens[Math.floor(num / 10)];
      if (num % 10) result += ' ' + ones[num % 10];
    }
  }

  return result.trim();
}

export function numberToWords(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let words = 'Rupees ' + inWords(rupees);
  if (paise > 0) words += ' and ' + inWords(paise) + ' Paise';
  return words + ' Only';
}

export function formatIndian(amount: number): string {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
