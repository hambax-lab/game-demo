// Рисунки модулей и иконки. Каждая функция возвращает готовую SVG-разметку.

export const ICON = {
  star: '<svg viewBox="0 0 24 24"><path d="M12 2.5 L14.8 8.8 L21.5 9.4 L16.4 13.8 L18 20.5 L12 17 L6 20.5 L7.6 13.8 L2.5 9.4 L9.2 8.8 Z" fill="#22252B"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20 C5 15 2.5 11.5 2.5 8.2 A4.7 4.7 0 0 1 12 6 A4.7 4.7 0 0 1 21.5 8.2 C21.5 11.5 19 15 12 20 Z" fill="#E04B3A"/></svg>',
  chest: '<svg viewBox="0 0 24 24"><rect x="3" y="9" width="18" height="11" rx="2" fill="#8C5B3F"/><path d="M3 10 Q3 4 12 4 Q21 4 21 10 Z" fill="#A86E4C"/><rect x="3" y="9" width="18" height="2.5" fill="#22252B" opacity=".3"/><rect x="10.5" y="10" width="3" height="4" rx="1" fill="#FFC531"/></svg>',
  bone: '<svg viewBox="0 0 24 24"><g fill="#F4F0E6"><circle cx="5" cy="9" r="3"/><circle cx="5" cy="15" r="3"/><circle cx="19" cy="9" r="3"/><circle cx="19" cy="15" r="3"/><rect x="5" y="10" width="14" height="4"/></g></svg>',
};

export function moduleArtMarkup(id, x, fy) {
  // returns svg markup drawn around bottom-centre (x, fy)
  const t = (dx, dy) => `${x + dx},${fy + dy}`;
  switch (id) {
    case 'laptop': return `
      <rect x="${x - 28}" y="${fy - 24}" width="56" height="5" rx="2" fill="#8C5B3F"/>
      <rect x="${x - 25}" y="${fy - 19}" width="4" height="19" fill="#74492F"/>
      <rect x="${x + 21}" y="${fy - 19}" width="4" height="19" fill="#74492F"/>
      <rect x="${x - 14}" y="${fy - 27}" width="22" height="3" rx="1.5" fill="#3B4250"/>
      <rect x="${x - 12}" y="${fy - 42}" width="18" height="15" rx="2" fill="#3B4250"/>
      <rect class="screen" x="${x - 10}" y="${fy - 40}" width="14" height="11" rx="1" fill="#8FE3D4"/>
      <rect x="${x + 12}" y="${fy - 30}" width="6" height="6" rx="1.5" fill="#E04B3A"/>
      <rect x="${x + 6}" y="${fy - 13}" width="15" height="4" rx="2" fill="#2F6F6A"/>
      <rect x="${x + 18}" y="${fy - 28}" width="4" height="16" rx="2" fill="#2F6F6A"/>
      <rect x="${x + 12}" y="${fy - 9}" width="2.5" height="9" fill="#5E584F"/>`;
    case 'greenhouse': return `
      <polygon points="${t(-22, -58)} ${t(22, -58)} ${t(34, -14)} ${t(-34, -14)}" fill="url(#growLight)"/>
      <rect x="${x - 26}" y="${fy - 62}" width="52" height="5" rx="2.5" fill="#3B4250"/>
      <rect x="${x - 22}" y="${fy - 58}" width="44" height="2" fill="#D88BFF"/>
      <path d="M${x - 20} ${fy - 14} q-2 -14 4 -22 M${x - 6} ${fy - 14} q2 -18 -2 -26 M${x + 8} ${fy - 14} q-1 -14 3 -20 M${x + 20} ${fy - 14} q2 -12 -2 -18" stroke="#3E8E46" stroke-width="2" fill="none"/>
      <circle cx="${x - 17}" cy="${fy - 33}" r="5" fill="#5FB35A"/><circle cx="${x - 22}" cy="${fy - 26}" r="4" fill="#4FA04E"/>
      <circle cx="${x - 7}" cy="${fy - 38}" r="5.5" fill="#5FB35A"/><circle cx="${x - 2}" cy="${fy - 30}" r="4" fill="#4FA04E"/>
      <circle cx="${x + 11}" cy="${fy - 32}" r="5" fill="#5FB35A"/><circle cx="${x + 18}" cy="${fy - 30}" r="4.5" fill="#4FA04E"/>
      <circle cx="${x - 12}" cy="${fy - 24}" r="3" fill="#E5533F"/><circle cx="${x + 4}" cy="${fy - 22}" r="3" fill="#E5533F"/><circle cx="${x + 16}" cy="${fy - 23}" r="2.6" fill="#F08A3A"/>
      <rect x="${x - 30}" y="${fy - 15}" width="60" height="15" rx="3" fill="#7A5235"/>
      <rect x="${x - 30}" y="${fy - 15}" width="60" height="4" rx="2" fill="#4A3020"/>`;
    case 'filter': return `
      <rect x="${x - 26}" y="${fy - 58}" width="40" height="4" rx="2" fill="#8B8478"/>
      <rect x="${x - 26}" y="${fy - 58}" width="4" height="22" rx="2" fill="#8B8478"/>
      <rect x="${x - 15}" y="${fy - 50}" width="30" height="50" rx="11" fill="#4BA3D9"/>
      <rect x="${x - 10}" y="${fy - 44}" width="5" height="34" rx="2.5" fill="#8CCBF0"/>
      <rect x="${x - 2}" y="${fy - 30}" width="12" height="22" rx="4" fill="#2E7FB3"/>
      <rect x="${x - 2}" y="${fy - 20}" width="12" height="12" rx="4" fill="#9EDCFF"/>
      <circle cx="${x + 18}" cy="${fy - 28}" r="6" fill="#F4F0E6" stroke="#5E656E" stroke-width="2"/>
      <path d="M${x + 18} ${fy - 28} l3 -3" stroke="#E04B3A" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="${x + 14}" y="${fy - 12}" width="12" height="3" rx="1.5" fill="#5E656E"/>`;
    case 'generator': return `
      <rect x="${x + 14}" y="${fy - 50}" width="5" height="22" rx="2" fill="#5E656E"/>
      <rect x="${x - 26}" y="${fy - 32}" width="52" height="32" rx="5" fill="#FFC531"/>
      <rect x="${x - 26}" y="${fy - 9}" width="52" height="9" fill="url(#hazardStripe)"/>
      <rect x="${x - 20}" y="${fy - 26}" width="18" height="2.5" rx="1" fill="#B98A10"/>
      <rect x="${x - 20}" y="${fy - 21}" width="18" height="2.5" rx="1" fill="#B98A10"/>
      <rect x="${x - 20}" y="${fy - 16}" width="18" height="2.5" rx="1" fill="#B98A10"/>
      <path d="M${x + 9} ${fy - 27} l-5 9 h4 l-2 7 6 -10 h-4 z" fill="#22252B"/>`;
  }
  return '';
}
