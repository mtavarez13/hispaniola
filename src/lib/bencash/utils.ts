/**
 * Utilidades puras para teléfonos y operadores de Haití (Digicel MonCash / Natcom NatCash).
 * Adecuadas para uso tanto en cliente (Browser) como en servidor (Node.js).
 */

export function formatHaitiPhoneNumber(phone: string): string {
  let clean = (phone || '').replace(/\D/g, '');
  if (clean.startsWith('00509')) clean = clean.slice(2);
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
  label: string;
  logoColor: string;
  isDetected: boolean;
} {
  const clean = formatHaitiPhoneNumber(phone);
  const localPart = clean.startsWith('509') ? clean.slice(3) : clean;

  const prefix2 = localPart.slice(0, 2);
  const moncashPrefixes = ['31', '34', '36', '37', '38', '39', '40', '41', '42', '43', '44', '46', '47', '48', '49'];
  const natcashPrefixes = ['22', '28', '29', '32', '33', '35', '45', '55'];

  if (moncashPrefixes.includes(prefix2)) {
    return { operator: 'MonCash', label: 'Digicel MonCash', logoColor: '#E60000', isDetected: true };
  } else if (natcashPrefixes.includes(prefix2)) {
    return { operator: 'NatCash', label: 'Natcom NatCash', logoColor: '#006699', isDetected: true };
  }

  return { operator: 'Unknown', label: 'Operador no identificado', logoColor: '#64748B', isDetected: false };
}
