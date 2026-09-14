import {
  CalendarData,
  ContactData,
  CryptoData,
  EmailData,
  GeoData,
  ParsedQRData,
  QRContentType,
  SmsData,
  UrlSecurityAnalysis,
  WifiData,
} from '../types';

const SUSPICIOUS_TLDS = [
  '.zip', '.mov', '.top', '.xyz', '.work', '.click', '.loan', '.fit', '.gq', '.cf', '.tk', '.ml', '.ga'
];

export function analyzeUrlSecurity(urlStr: string): UrlSecurityAnalysis {
  let domain = '';
  let protocol = 'unknown:';
  let isHttps = false;
  let isIpAddress = false;
  let hasSuspiciousTld = false;
  const flags: string[] = [];
  let score = 95;

  try {
    const parsed = new URL(urlStr.startsWith('http://') || urlStr.startsWith('https://') ? urlStr : `https://${urlStr}`);
    domain = parsed.hostname;
    protocol = parsed.protocol;
    isHttps = protocol === 'https:';

    if (!isHttps) {
      score -= 30;
      flags.push('Unencrypted connection (HTTP instead of HTTPS)');
    }

    // Check if hostname is an IPv4 address
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(domain)) {
      isIpAddress = true;
      score -= 35;
      flags.push('Direct IP address used instead of verified domain name');
    }

    // Check suspicious TLDs
    for (const tld of SUSPICIOUS_TLDS) {
      if (domain.toLowerCase().endsWith(tld)) {
        hasSuspiciousTld = true;
        score -= 20;
        flags.push(`Uses high-risk Top-Level Domain (${tld})`);
        break;
      }
    }

    // Subdomain count
    const parts = domain.split('.');
    if (parts.length > 4) {
      score -= 15;
      flags.push('Unusually high number of subdomains (potential spoofing)');
    }

    // Check for login / verify / password in path
    const lowerPath = parsed.pathname.toLowerCase() + parsed.search.toLowerCase();
    if (lowerPath.includes('login') || lowerPath.includes('password') || lowerPath.includes('verify-account')) {
      flags.push('Contains authentication keywords (verify authenticity before entering credentials)');
    }

    // Check for @ symbol in URL (HTTP basic auth deception)
    if (urlStr.includes('@')) {
      score -= 40;
      flags.push('Contains embedded credentials / redirection character (@)');
    }

  } catch {
    score = 50;
    flags.push('Could not parse standardized URL format');
  }

  score = Math.max(0, Math.min(100, score));
  const isSafe = score >= 65;

  return {
    isSafe,
    score,
    isHttps,
    domain,
    protocol,
    hasSuspiciousTld,
    isIpAddress,
    flags,
  };
}

export function parseQRContent(rawText: string): ParsedQRData {
  const trimmed = rawText.trim();

  // 1. Wi-Fi Pattern: WIFI:T:WPA;S:NetworkName;P:Password;H:false;;
  if (trimmed.toUpperCase().startsWith('WIFI:')) {
    const wifi = parseWifiString(trimmed);
    return {
      type: 'wifi',
      raw: trimmed,
      title: wifi.ssid || 'Wi-Fi Network',
      subtitle: `Security: ${wifi.securityType} ${wifi.hidden ? '• Hidden SSID' : ''}`,
      wifi,
    };
  }

  // 2. vCard / MeCard: BEGIN:VCARD ... END:VCARD or MECARD:...
  if (trimmed.toUpperCase().startsWith('BEGIN:VCARD') || trimmed.toUpperCase().startsWith('MECARD:')) {
    const contact = parseContactString(trimmed);
    return {
      type: 'contact',
      raw: trimmed,
      title: contact.name || 'Contact Card',
      subtitle: [contact.phone, contact.email, contact.organization].filter(Boolean).join(' • ') || 'vCard Information',
      contact,
    };
  }

  // 3. Calendar: BEGIN:VEVENT ... END:VEVENT or BEGIN:VCALENDAR
  if (trimmed.toUpperCase().startsWith('BEGIN:VEVENT') || trimmed.toUpperCase().startsWith('BEGIN:VCALENDAR')) {
    const calendar = parseCalendarString(trimmed);
    return {
      type: 'calendar',
      raw: trimmed,
      title: calendar.title || 'Calendar Event',
      subtitle: [calendar.startTime, calendar.location].filter(Boolean).join(' • ') || 'iCal Event',
      calendar,
    };
  }

  // 4. Crypto: bitcoin:, ethereum:, solana:
  const cryptoMatch = trimmed.match(/^(bitcoin|ethereum|solana):([a-zA-Z0-9]+)(\?.*)?$/i);
  if (cryptoMatch) {
    const crypto = parseCryptoString(trimmed, cryptoMatch[1].toLowerCase());
    return {
      type: 'crypto',
      raw: trimmed,
      title: `${crypto.currency.toUpperCase()} Wallet`,
      subtitle: crypto.address.slice(0, 8) + '...' + crypto.address.slice(-6),
      crypto,
    };
  }

  // 5. Email: mailto: or MATMSG:
  if (trimmed.toLowerCase().startsWith('mailto:') || trimmed.toUpperCase().startsWith('MATMSG:')) {
    const email = parseEmailString(trimmed);
    return {
      type: 'email',
      raw: trimmed,
      title: `Email to ${email.to}`,
      subtitle: email.subject ? `Subject: ${email.subject}` : 'Email message',
      email,
    };
  }

  // 6. Phone: tel:
  if (trimmed.toLowerCase().startsWith('tel:')) {
    const phone = trimmed.slice(4).replace(/\s+/g, '');
    return {
      type: 'phone',
      raw: trimmed,
      title: `Call ${phone}`,
      subtitle: 'Telephone dialer',
      contact: { phone, name: 'Phone Contact' },
    };
  }

  // 7. SMS: sms: or smsto:
  if (trimmed.toLowerCase().startsWith('sms:') || trimmed.toLowerCase().startsWith('smsto:')) {
    const sms = parseSmsString(trimmed);
    return {
      type: 'sms',
      raw: trimmed,
      title: `SMS to ${sms.phone}`,
      subtitle: sms.message ? `"${sms.message.slice(0, 40)}..."` : 'Text message',
      sms,
    };
  }

  // 8. Geo Coordinates: geo:37.7749,-122.4194
  if (trimmed.toLowerCase().startsWith('geo:')) {
    const geo = parseGeoString(trimmed);
    return {
      type: 'geo',
      raw: trimmed,
      title: geo.label || 'Geographic Location',
      subtitle: `${geo.latitude.toFixed(5)}, ${geo.longitude.toFixed(5)}`,
      geo,
    };
  }

  // 9. URL: http://, https://, or standard domain pattern
  const urlPattern = /^(https?:\/\/|www\.)[^\s/$.?#].[^\s]*$/i;
  const isLikelyUrl = urlPattern.test(trimmed) || (!trimmed.includes(' ') && /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/[^\s]*)?$/i.test(trimmed));
  if (isLikelyUrl) {
    const normalizedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    const urlAnalysis = analyzeUrlSecurity(normalizedUrl);
    return {
      type: 'url',
      raw: trimmed,
      title: urlAnalysis.domain || trimmed,
      subtitle: normalizedUrl,
      urlAnalysis,
    };
  }

  // 10. Plain text / raw barcode
  return {
    type: 'text',
    raw: trimmed,
    title: trimmed.length > 50 ? trimmed.slice(0, 50) + '...' : trimmed,
    subtitle: `${trimmed.length} characters • ${trimmed.split(/\s+/).filter(Boolean).length} words`,
  };
}

// Helpers
function parseWifiString(str: string): WifiData {
  const content = str.replace(/^WIFI:/i, '');
  const parts = content.split(';');
  let ssid = '';
  let password = '';
  let securityType: WifiData['securityType'] = 'WPA';
  let hidden = false;

  for (const part of parts) {
    if (!part) continue;
    const [key, ...valParts] = part.split(':');
    const val = valParts.join(':');
    if (key === 'S') ssid = val;
    if (key === 'P') password = val;
    if (key === 'T') {
      const upper = val.toUpperCase();
      if (upper === 'WEP') securityType = 'WEP';
      else if (upper === 'NOPASS') securityType = 'nopass';
      else if (upper === 'WPA3') securityType = 'WPA3';
      else securityType = 'WPA';
    }
    if (key === 'H') hidden = val.toLowerCase() === 'true';
  }

  return { ssid, password, securityType, hidden };
}

function parseContactString(str: string): ContactData {
  const contact: ContactData = {};

  if (str.toUpperCase().startsWith('MECARD:')) {
    const content = str.replace(/^MECARD:/i, '');
    const parts = content.split(';');
    for (const part of parts) {
      if (!part) continue;
      const [key, ...val] = part.split(':');
      const valStr = val.join(':');
      if (key === 'N') contact.name = valStr.replace(',', ' ');
      if (key === 'TEL') contact.phone = valStr;
      if (key === 'EMAIL') contact.email = valStr;
      if (key === 'ORG') contact.organization = valStr;
      if (key === 'ADR') contact.address = valStr;
      if (key === 'NOTE') contact.notes = valStr;
    }
    return contact;
  }

  // Standard vCard 2.1 / 3.0 / 4.0
  const lines = str.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toUpperCase();
    const val = line.slice(colonIdx + 1).trim();

    if (key.startsWith('FN')) contact.name = val;
    else if (!contact.name && key.startsWith('N')) {
      const nameParts = val.split(';').filter(Boolean);
      contact.name = nameParts.reverse().join(' ');
    }
    else if (key.startsWith('TEL')) contact.phone = val;
    else if (key.startsWith('EMAIL')) contact.email = val;
    else if (key.startsWith('ORG')) contact.organization = val;
    else if (key.startsWith('TITLE')) contact.title = val;
    else if (key.startsWith('URL')) contact.url = val;
    else if (key.startsWith('ADR')) contact.address = val.replace(/;/g, ' ').trim();
    else if (key.startsWith('NOTE')) contact.notes = val;
  }

  return contact;
}

function parseEmailString(str: string): EmailData {
  if (str.toLowerCase().startsWith('mailto:')) {
    try {
      const url = new URL(str);
      return {
        to: url.pathname,
        subject: url.searchParams.get('subject') || undefined,
        body: url.searchParams.get('body') || undefined,
        cc: url.searchParams.get('cc') || undefined,
      };
    } catch {
      const rawTo = str.slice(7).split('?')[0];
      return { to: rawTo };
    }
  }

  // MATMSG:TO:email;SUB:subject;BODY:body;;
  const toMatch = str.match(/TO:([^;]+)/i);
  const subMatch = str.match(/SUB:([^;]+)/i);
  const bodyMatch = str.match(/BODY:([^;]+)/i);

  return {
    to: toMatch ? toMatch[1] : '',
    subject: subMatch ? subMatch[1] : undefined,
    body: bodyMatch ? bodyMatch[1] : undefined,
  };
}

function parseSmsString(str: string): SmsData {
  if (str.toLowerCase().startsWith('smsto:')) {
    const parts = str.slice(6).split(':');
    return {
      phone: parts[0] || '',
      message: parts.slice(1).join(':') || undefined,
    };
  }

  // sms:+123?body=message
  try {
    const raw = str.slice(4);
    const [phone, query] = raw.split('?');
    let message: string | undefined;
    if (query) {
      const params = new URLSearchParams(query);
      message = params.get('body') || undefined;
    }
    return { phone: phone || '', message };
  } catch {
    return { phone: str.slice(4) };
  }
}

function parseGeoString(str: string): GeoData {
  // geo:latitude,longitude,altitude?q=label
  const content = str.slice(4);
  const [coords, query] = content.split('?');
  const [latStr, lngStr, altStr] = coords.split(',');
  const lat = parseFloat(latStr) || 0;
  const lng = parseFloat(lngStr) || 0;
  const alt = altStr ? parseFloat(altStr) : undefined;
  let label: string | undefined;

  if (query) {
    const params = new URLSearchParams(query);
    label = params.get('q') || undefined;
  }

  return {
    latitude: lat,
    longitude: lng,
    altitude: alt,
    label: label || `Map Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
  };
}

function parseCalendarString(str: string): CalendarData {
  const lines = str.split(/\r?\n/);
  let title = 'Calendar Event';
  let description: string | undefined;
  let location: string | undefined;
  let startTime: string | undefined;
  let endTime: string | undefined;

  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toUpperCase();
    const val = line.slice(colonIdx + 1).trim();

    if (key.startsWith('SUMMARY')) title = val;
    else if (key.startsWith('DESCRIPTION')) description = val;
    else if (key.startsWith('LOCATION')) location = val;
    else if (key.startsWith('DTSTART')) startTime = formatIcsDate(val);
    else if (key.startsWith('DTEND')) endTime = formatIcsDate(val);
  }

  return { title, description, location, startTime, endTime };
}

function formatIcsDate(val: string): string {
  // Format 20260914T153000Z or 20260914
  if (val.length >= 8) {
    const y = val.slice(0, 4);
    const m = val.slice(4, 6);
    const d = val.slice(6, 8);
    if (val.includes('T') && val.length >= 13) {
      const timePart = val.split('T')[1];
      const hh = timePart.slice(0, 2);
      const mm = timePart.slice(2, 4);
      return `${y}-${m}-${d} ${hh}:${mm}`;
    }
    return `${y}-${m}-${d}`;
  }
  return val;
}

function parseCryptoString(str: string, currency: string): CryptoData {
  const [prefixAndAddress, query] = str.split('?');
  const address = prefixAndAddress.split(':')[1] || '';
  let amount: string | undefined;
  let label: string | undefined;
  let message: string | undefined;

  if (query) {
    const params = new URLSearchParams(query);
    amount = params.get('amount') || undefined;
    label = params.get('label') || undefined;
    message = params.get('message') || undefined;
  }

  const validCurrency: CryptoData['currency'] =
    currency === 'bitcoin' || currency === 'ethereum' || currency === 'solana' ? currency : 'other';

  return {
    currency: validCurrency,
    address,
    amount,
    label,
    message,
  };
}
