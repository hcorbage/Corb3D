export function validateCPF(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  if (check !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10 || check === 11) check = 0;
  return check === parseInt(digits[10]);
}

export function validateCNPJ(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (d: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(d[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  if (calc(digits, w1) !== parseInt(digits[12])) return false;
  if (calc(digits, w2) !== parseInt(digits[13])) return false;
  return true;
}

export function validateCPF_CNPJ(raw: string): { valid: boolean; message: string } {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return { valid: false, message: "CPF/CNPJ é obrigatório." };
  if (digits.length <= 11) {
    return validateCPF(digits)
      ? { valid: true, message: "" }
      : { valid: false, message: "CPF inválido." };
  }
  return validateCNPJ(digits)
    ? { valid: true, message: "" }
    : { valid: false, message: "CNPJ inválido." };
}
