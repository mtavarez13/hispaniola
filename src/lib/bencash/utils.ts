/**
 * Utilidades puras para teléfonos y operadores de Haití (Digicel MonCash / Natcom NatCash).
 * Adecuadas para uso tanto en cliente (Browser) como en servidor (Node.js).
 */

export function formatHaitiPhoneNumber(phone: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  if (clean.startsWith('509')) {
    return clean;
  }
  if (clean.length === 8) {
    return `509${clean}`;
  }
  return clean;
}

export function detectHaitiOperator(phone: string): {
  operator: 'MonCash' | 'NatCash' | 'Unknown';
  logoColor: string;
} {
  const clean = formatHaitiPhoneNumber(phone);
  const localPart = clean.startsWith('509') ? clean.slice(3) : clean;

  const prefix2 = localPart.slice(0, 2);
  const moncashPrefixes = ['31', '34', '36', '37', '38', '39', '40', '41', '42', '43', '44', '46', '47', '48', '49'];
  const natcashPrefixes = ['22', '32', '33', '35', '45', '55'];

  if (moncashPrefixes.includes(prefix2)) {
    return { operator: 'MonCash', logoColor: '#E60000' };
  } else if (natcashPrefixes.includes(prefix2)) {
    return { operator: 'NatCash', logoColor: '#006699' };
  }

  return { operator: 'MonCash', logoColor: '#E60000' };
}
