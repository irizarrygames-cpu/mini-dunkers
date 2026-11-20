// The league: 70 national teams (the top 20 first), their kits, and how two of them share a pitch.
// (Identifiers still say "club" from when these were clubs.) Names, kit colours and simple
// flags only — no crests. `level` (0..3) is how hard that team's bots play.
// Loads in the browser and on the server (no DOM at load time).

// jersey, shorts, socks, accent (trim / collar), extras: stripes | sleeves | center | checks
function makeKit(jersey, shorts, socks, accent, extra = {}) {
  const light = colorLum(jersey) > 0.72;
  return {
    jersey, shorts, socks, accent, shoes: '#1b1d33',
    shade: shadeHex(jersey, light ? -0.16 : -0.24),
    board: shadeHex(jersey, light ? -0.06 : -0.06),
    lip: shadeHex(jersey, 0.35),
    fx: light ? shadeHex(accent === '#ffffff' ? '#46d9ff' : accent, 0.2) : shadeHex(jersey, 0.3),
    ...extra,
  };
}
function colorLum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
function colorDist(a, b) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  return Math.hypot(((x >> 16) & 255) - ((y >> 16) & 255), ((x >> 8) & 255) - ((y >> 8) & 255), (x & 255) - (y & 255));
}

const W_ = '#f4f5f7', B_ = '#16171d';
const CLUBS = [
  { id: 'argentina', name: tl('ARGENTINA'), short: 'ARG', level: 3,
    home: makeKit(W_, B_, W_, '#1b1d33', { stripes: '#75aadb' }), away: makeKit('#2b2a6b', '#2b2a6b', '#2b2a6b', '#75aadb') },
  { id: 'spain', name: tl('SPAIN'), short: 'ESP', level: 3,
    home: makeKit('#c60b1e', '#1d2a52', '#1d2a52', '#ffc400'), away: makeKit(W_, W_, W_, '#c60b1e') },
  { id: 'france', name: tl('FRANCE'), short: 'FRA', level: 3,
    home: makeKit('#1f2a5c', W_, '#e1000f', W_), away: makeKit(W_, '#1f2a5c', W_, '#1f2a5c') },
  { id: 'england', name: tl('ENGLAND'), short: 'ENG', level: 3,
    home: makeKit(W_, '#1d2a52', W_, '#cf142b'), away: makeKit('#cf142b', '#cf142b', '#cf142b', W_) },
  { id: 'brazil', name: tl('BRAZIL'), short: 'BRA', level: 3,
    home: makeKit('#ffdf00', '#0a3fa8', W_, '#009b3a'), away: makeKit('#0a3fa8', W_, '#0a3fa8', '#ffdf00') },
  { id: 'portugal', name: tl('PORTUGAL'), short: 'POR', level: 3,
    home: makeKit('#b5121b', '#b5121b', '#b5121b', '#046a38', { sleeves: '#046a38' }), away: makeKit(W_, W_, W_, '#046a38') },
  { id: 'netherlands', name: tl('NETHERLANDS'), short: 'NED', level: 2,
    home: makeKit('#ff6c00', B_, '#ff6c00', B_), away: makeKit('#1b2a5a', '#1b2a5a', '#1b2a5a', '#ff6c00') },
  { id: 'belgium', name: tl('BELGIUM'), short: 'BEL', level: 2,
    home: makeKit('#e30613', B_, '#e30613', '#fdda24'), away: makeKit(W_, W_, W_, B_) },
  { id: 'italy', name: tl('ITALY'), short: 'ITA', level: 2,
    home: makeKit('#0066cc', W_, '#0066cc', '#c9a64b'), away: makeKit(W_, '#0066cc', W_, '#0066cc') },
  { id: 'germany', name: tl('GERMANY'), short: 'GER', level: 2,
    home: makeKit(W_, B_, W_, B_), away: makeKit(B_, B_, B_, '#dd0000') },
  { id: 'croatia', name: tl('CROATIA'), short: 'CRO', level: 2,
    home: makeKit(W_, W_, '#171796', '#171796', { checks: '#e30613' }), away: makeKit('#171796', '#171796', '#171796', '#e30613') },
  { id: 'morocco', name: tl('MOROCCO'), short: 'MAR', level: 2,
    home: makeKit('#c1272d', '#006233', '#c1272d', '#006233'), away: makeKit(W_, W_, W_, '#c1272d') },
  { id: 'colombia', name: tl('COLOMBIA'), short: 'COL', level: 2,
    home: makeKit('#fcd116', '#003893', W_, '#ce1126'), away: makeKit('#003893', '#003893', '#003893', '#fcd116') },
  { id: 'uruguay', name: tl('URUGUAY'), short: 'URU', level: 1,
    home: makeKit('#5cbfeb', B_, B_, W_), away: makeKit(W_, W_, W_, '#5cbfeb') },
  { id: 'usa', name: tl('USA'), short: 'USA', level: 1,
    home: makeKit(W_, '#0a3161', W_, '#b31942'), away: makeKit('#0a3161', '#0a3161', '#0a3161', '#b31942') },
  { id: 'mexico', name: tl('MEXICO'), short: 'MEX', level: 1,
    home: makeKit('#006847', W_, '#ce1126', '#ce1126'), away: makeKit(W_, B_, W_, '#006847') },
  { id: 'japan', name: tl('JAPAN'), short: 'JPN', level: 1,
    home: makeKit('#1c2a7a', W_, '#1c2a7a', '#bc002d'), away: makeKit(W_, '#1c2a7a', W_, '#1c2a7a') },
  { id: 'switzerland', name: tl('SWITZERLAND'), short: 'SUI', level: 1,
    home: makeKit('#d52b1e', W_, '#d52b1e', W_), away: makeKit(W_, '#d52b1e', W_, '#d52b1e') },
  { id: 'senegal', name: tl('SENEGAL'), short: 'SEN', level: 0,
    home: makeKit(W_, W_, W_, '#00853f', { sleeves: '#00853f' }), away: makeKit('#00853f', '#00853f', '#00853f', '#fdef42') },
  { id: 'denmark', name: tl('DENMARK'), short: 'DEN', level: 0,
    home: makeKit('#c8102e', W_, '#c8102e', W_), away: makeKit(W_, '#c8102e', W_, '#c8102e') },
  // the next fifty: the best-ranked teams we didn't have yet, plus Puerto Rico and the Dominican Republic.
  // `flag` is a list of simple shapes in 0..1 flag space, drawn by UI.flagBadge.
  { id: 'austria', name: tl('AUSTRIA'), short: 'AUT', level: 1,
    home: makeKit('#ed2939', W_, '#ed2939', W_), away: makeKit(W_, '#ed2939', W_, '#ed2939'),
    flag: [['h', ['#ed2939', '#ffffff', '#ed2939']]] },
  { id: 'ecuador', name: tl('ECUADOR'), short: 'ECU', level: 1,
    home: makeKit('#ffd100', '#034ea2', '#034ea2', '#ed1c24'), away: makeKit('#034ea2', '#034ea2', '#034ea2', '#ffd100'),
    flag: [['h', ['#ffd100', '#034ea2', '#ed1c24'], [2, 1, 1]], ['dot', '#a5732e', 0.5, 0.46, 0.13]] },
  { id: 'turkey', name: tl('TURKEY'), short: 'TUR', level: 1,
    home: makeKit('#e30a17', W_, '#e30a17', W_), away: makeKit(W_, '#e30a17', W_, '#e30a17'),
    flag: [['fill', '#e30a17'], ['crescent', '#ffffff', 0.4, 0.5, 0.26], ['star', '#ffffff', 0.61, 0.5, 0.12]] },
  { id: 'southkorea', name: tl('SOUTH KOREA'), short: 'KOR', level: 1,
    home: makeKit('#c60c30', B_, '#c60c30', '#003478'), away: makeKit(W_, B_, W_, '#c60c30'),
    flag: [['fill', '#ffffff'], ['halfdot', '#cd2e3a', '#0047a0', 0.5, 0.5, 0.25], ['rect', '#1b1b1b', 0.1, 0.12, 0.14, 0.1], ['rect', '#1b1b1b', 0.76, 0.12, 0.14, 0.1], ['rect', '#1b1b1b', 0.1, 0.78, 0.14, 0.1], ['rect', '#1b1b1b', 0.76, 0.78, 0.14, 0.1]] },
  { id: 'iran', name: tl('IRAN'), short: 'IRN', level: 1,
    home: makeKit(W_, W_, W_, '#239f40'), away: makeKit('#da0000', '#da0000', '#da0000', W_),
    flag: [['h', ['#239f40', '#ffffff', '#da0000']], ['dot', '#da0000', 0.5, 0.5, 0.09]] },
  { id: 'australia', name: tl('AUSTRALIA'), short: 'AUS', level: 1,
    home: makeKit('#ffcd00', '#00843d', '#ffcd00', '#00843d'), away: makeKit('#00843d', '#00843d', '#00843d', '#ffcd00'),
    flag: [['fill', '#012169'], ['rect', '#ffffff', 0.19, 0, 0.12, 0.5], ['rect', '#ffffff', 0, 0.19, 0.5, 0.12], ['rect', '#c8102e', 0.22, 0, 0.06, 0.5], ['rect', '#c8102e', 0, 0.22, 0.5, 0.06],
      ['star', '#ffffff', 0.25, 0.76, 0.14], ['star', '#ffffff', 0.76, 0.22, 0.07], ['star', '#ffffff', 0.88, 0.44, 0.07], ['star', '#ffffff', 0.66, 0.52, 0.07], ['star', '#ffffff', 0.76, 0.82, 0.07]] },
  { id: 'ukraine', name: tl('UKRAINE'), short: 'UKR', level: 1,
    home: makeKit('#ffd700', '#ffd700', '#ffd700', '#0057b7'), away: makeKit('#0057b7', '#0057b7', '#0057b7', '#ffd700'),
    flag: [['h', ['#0057b7', '#ffd700']]] },
  { id: 'sweden', name: tl('SWEDEN'), short: 'SWE', level: 1,
    home: makeKit('#fecc02', '#006aa7', '#fecc02', '#006aa7'), away: makeKit('#006aa7', '#006aa7', '#006aa7', '#fecc02'),
    flag: [['fill', '#006aa7'], ['nordic', '#fecc02', 0.2]] },
  { id: 'wales', name: tl('WALES'), short: 'WAL', level: 1,
    home: makeKit('#c8102e', '#c8102e', '#c8102e', '#00b140'), away: makeKit(W_, '#00b140', W_, '#00b140'),
    flag: [['h', ['#ffffff', '#00b140']], ['poly', '#c8102e', [[0.3, 0.64], [0.36, 0.42], [0.5, 0.38], [0.58, 0.24], [0.68, 0.28], [0.63, 0.4], [0.74, 0.46], [0.65, 0.52], [0.72, 0.68], [0.6, 0.62], [0.5, 0.72], [0.42, 0.62]]]] },
  { id: 'poland', name: tl('POLAND'), short: 'POL', level: 1,
    home: makeKit(W_, '#dc143c', W_, '#dc143c'), away: makeKit('#dc143c', '#dc143c', '#dc143c', W_),
    flag: [['h', ['#ffffff', '#dc143c']]] },
  { id: 'serbia', name: tl('SERBIA'), short: 'SRB', level: 1,
    home: makeKit('#c6363c', '#0c4076', W_, W_), away: makeKit(W_, W_, W_, '#c6363c'),
    flag: [['h', ['#c6363c', '#0c4076', '#ffffff']], ['dot', '#ffffff', 0.34, 0.46, 0.2], ['dot', '#c6363c', 0.34, 0.46, 0.15]] },
  { id: 'norway', name: tl('NORWAY'), short: 'NOR', level: 1,
    home: makeKit('#ba0c2f', W_, '#00205b', '#00205b'), away: makeKit(W_, '#00205b', W_, '#ba0c2f'),
    flag: [['fill', '#ba0c2f'], ['nordic', '#ffffff', 0.26], ['nordic', '#00205b', 0.13]] },
  { id: 'hungary', name: tl('HUNGARY'), short: 'HUN', level: 0,
    home: makeKit('#cd2a3e', W_, '#436f4d', '#436f4d'), away: makeKit(W_, W_, W_, '#cd2a3e'),
    flag: [['h', ['#cd2a3e', '#ffffff', '#436f4d']]] },
  { id: 'nigeria', name: tl('NIGERIA'), short: 'NGA', level: 0,
    home: makeKit('#008751', '#008751', '#008751', W_), away: makeKit(W_, '#008751', W_, '#008751'),
    flag: [['v', ['#008751', '#ffffff', '#008751']]] },
  { id: 'egypt', name: tl('EGYPT'), short: 'EGY', level: 0,
    home: makeKit('#ce1126', W_, B_, '#c09300'), away: makeKit(W_, B_, W_, '#ce1126'),
    flag: [['h', ['#ce1126', '#ffffff', '#1b1b1b']], ['dot', '#c09300', 0.5, 0.5, 0.11]] },
  { id: 'algeria', name: tl('ALGERIA'), short: 'ALG', level: 0,
    home: makeKit(W_, W_, W_, '#006233'), away: makeKit('#006233', '#006233', '#006233', W_),
    flag: [['v', ['#006233', '#ffffff']], ['crescent', '#d21034', 0.5, 0.5, 0.27], ['star', '#d21034', 0.58, 0.5, 0.11]] },
  { id: 'canada', name: tl('CANADA'), short: 'CAN', level: 0,
    home: makeKit('#d80621', '#d80621', '#d80621', W_), away: makeKit(W_, W_, W_, '#d80621'),
    flag: [['v', ['#d80621', '#ffffff', '#d80621'], [1, 2, 1]], ['star', '#d80621', 0.5, 0.46, 0.24], ['rect', '#d80621', 0.487, 0.58, 0.026, 0.2]] },
  { id: 'scotland', name: tl('SCOTLAND'), short: 'SCO', level: 0,
    home: makeKit('#1b2f5b', W_, '#1b2f5b', W_), away: makeKit(W_, '#1b2f5b', W_, '#1b2f5b'),
    flag: [['fill', '#0065bd'], ['saltire', '#ffffff', 0.18]] },
  { id: 'czechia', name: tl('CZECHIA'), short: 'CZE', level: 0,
    home: makeKit('#d7141a', W_, '#11457e', W_), away: makeKit(W_, '#11457e', W_, '#d7141a'),
    flag: [['h', ['#ffffff', '#d7141a']], ['tri', '#11457e', 0.5]] },
  { id: 'panama', name: tl('PANAMA'), short: 'PAN', level: 0,
    home: makeKit('#da121a', '#072357', '#da121a', W_), away: makeKit(W_, W_, W_, '#072357'),
    flag: [['fill', '#ffffff'], ['rect', '#da121a', 0.5, 0, 0.5, 0.5], ['rect', '#072357', 0, 0.5, 0.5, 0.5], ['star', '#072357', 0.25, 0.25, 0.13], ['star', '#da121a', 0.75, 0.75, 0.13]] },
  { id: 'peru', name: tl('PERU'), short: 'PER', level: 0,
    home: makeKit(W_, W_, W_, '#d91023', { center: '#d91023' }), away: makeKit('#d91023', '#d91023', '#d91023', W_),
    flag: [['v', ['#d91023', '#ffffff', '#d91023']]] },
  { id: 'slovakia', name: tl('SLOVAKIA'), short: 'SVK', level: 0,
    home: makeKit(W_, '#0b4ea2', W_, '#0b4ea2'), away: makeKit('#0b4ea2', '#0b4ea2', '#0b4ea2', W_),
    flag: [['h', ['#ffffff', '#0b4ea2', '#ee1c25']], ['dot', '#ffffff', 0.34, 0.5, 0.24], ['dot', '#ee1c25', 0.34, 0.5, 0.19], ['plus', '#ffffff', 0.34, 0.49, 0.2]] },
  { id: 'romania', name: tl('ROMANIA'), short: 'ROU', level: 0,
    home: makeKit('#fcd116', '#002b7f', '#ce1126', '#002b7f'), away: makeKit('#002b7f', '#002b7f', '#002b7f', '#fcd116'),
    flag: [['v', ['#002b7f', '#fcd116', '#ce1126']]] },
  { id: 'greece', name: tl('GREECE'), short: 'GRE', level: 0,
    home: makeKit(W_, W_, W_, '#0d5eaf'), away: makeKit('#0d5eaf', '#0d5eaf', '#0d5eaf', W_),
    flag: [['h', ['#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf', '#ffffff', '#0d5eaf']], ['rect', '#0d5eaf', 0, 0, 0.38, 0.556], ['rect', '#ffffff', 0.15, 0, 0.08, 0.556], ['rect', '#ffffff', 0, 0.22, 0.38, 0.111]] },
  { id: 'ivorycoast', name: tl('IVORY COAST'), short: 'CIV', level: 0,
    home: makeKit('#f77f00', W_, '#009e60', '#009e60'), away: makeKit(W_, '#f77f00', W_, '#009e60'),
    flag: [['v', ['#f77f00', '#ffffff', '#009e60']]] },
  { id: 'tunisia', name: tl('TUNISIA'), short: 'TUN', level: 0,
    home: makeKit('#e70013', W_, '#e70013', W_), away: makeKit(W_, '#e70013', W_, '#e70013'),
    flag: [['fill', '#e70013'], ['dot', '#ffffff', 0.5, 0.5, 0.28], ['crescent', '#e70013', 0.48, 0.5, 0.2], ['star', '#e70013', 0.56, 0.5, 0.09]] },
  { id: 'costarica', name: tl('COSTA RICA'), short: 'CRC', level: 0,
    home: makeKit('#ce1126', '#002b7f', W_, W_), away: makeKit(W_, W_, W_, '#002b7f'),
    flag: [['h', ['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], [1, 1, 2, 1, 1]]] },
  { id: 'paraguay', name: tl('PARAGUAY'), short: 'PAR', level: 0,
    home: makeKit(W_, '#0038a8', '#0038a8', '#0038a8', { stripes: '#d52b1e' }), away: makeKit('#0038a8', '#0038a8', '#0038a8', W_),
    flag: [['h', ['#d52b1e', '#ffffff', '#0038a8']], ['dot', '#fcd116', 0.5, 0.5, 0.1]] },
  { id: 'chile', name: tl('CHILE'), short: 'CHI', level: 0,
    home: makeKit('#d52b1e', '#0039a6', W_, W_), away: makeKit(W_, W_, W_, '#d52b1e'),
    flag: [['h', ['#ffffff', '#d52b1e']], ['rect', '#0039a6', 0, 0, 0.334, 0.5], ['star', '#ffffff', 0.167, 0.25, 0.13]] },
  { id: 'venezuela', name: tl('VENEZUELA'), short: 'VEN', level: 0,
    home: makeKit('#7a1c2c', '#7a1c2c', '#7a1c2c', '#ffcc00'), away: makeKit(W_, '#7a1c2c', W_, '#7a1c2c'),
    flag: [['h', ['#fcd116', '#00247d', '#cf142b']], ['arcstars', '#ffffff', 0.5, 0.64, 0.24, 8, 0.04]] },
  { id: 'qatar', name: tl('QATAR'), short: 'QAT', level: 0,
    home: makeKit('#8a1538', W_, '#8a1538', W_), away: makeKit(W_, '#8a1538', W_, '#8a1538'),
    flag: [['fill', '#8a1538'], ['poly', '#ffffff', [[0, 0], [0.3, 0], [0.38, 0.056], [0.3, 0.111], [0.38, 0.167], [0.3, 0.222], [0.38, 0.278], [0.3, 0.333], [0.38, 0.389], [0.3, 0.444], [0.38, 0.5], [0.3, 0.556], [0.38, 0.611], [0.3, 0.667], [0.38, 0.722], [0.3, 0.778], [0.38, 0.833], [0.3, 0.889], [0.38, 0.944], [0.3, 1], [0, 1]]]] },
  { id: 'saudiarabia', name: tl('SAUDI ARABIA'), short: 'KSA', level: 0,
    home: makeKit(W_, W_, W_, '#006c35'), away: makeKit('#006c35', '#006c35', '#006c35', W_),
    flag: [['fill', '#006c35'], ['rect', '#ffffff', 0.25, 0.32, 0.5, 0.12], ['rect', '#ffffff', 0.28, 0.62, 0.44, 0.05], ['rect', '#ffffff', 0.69, 0.57, 0.03, 0.15]] },
  { id: 'cameroon', name: tl('CAMEROON'), short: 'CMR', level: 0,
    home: makeKit('#007a5e', '#ce1126', '#fcd116', '#fcd116'), away: makeKit('#fcd116', '#007a5e', '#fcd116', '#007a5e'),
    flag: [['v', ['#007a5e', '#ce1126', '#fcd116']], ['star', '#fcd116', 0.5, 0.5, 0.17]] },
  { id: 'mali', name: tl('MALI'), short: 'MLI', level: 0,
    home: makeKit('#14b53a', '#fcd116', '#ce1126', '#fcd116'), away: makeKit(W_, '#14b53a', W_, '#14b53a'),
    flag: [['v', ['#14b53a', '#fcd116', '#ce1126']]] },
  { id: 'ireland', name: tl('IRELAND'), short: 'IRL', level: 0,
    home: makeKit('#169b62', W_, '#169b62', '#ff883e'), away: makeKit(W_, '#169b62', W_, '#169b62'),
    flag: [['v', ['#169b62', '#ffffff', '#ff883e']]] },
  { id: 'slovenia', name: tl('SLOVENIA'), short: 'SVN', level: 0,
    home: makeKit(W_, '#005da4', W_, '#ed1c24'), away: makeKit('#1f9a4a', W_, '#1f9a4a', W_),
    flag: [['h', ['#ffffff', '#005da4', '#ed1c24']], ['poly', '#005da4', [[0.22, 0.15], [0.4, 0.15], [0.4, 0.42], [0.31, 0.52], [0.22, 0.42]]], ['poly', '#ffffff', [[0.25, 0.36], [0.31, 0.25], [0.37, 0.36]]]] },
  { id: 'albania', name: tl('ALBANIA'), short: 'ALB', level: 0,
    home: makeKit('#e41e20', B_, '#e41e20', B_), away: makeKit(B_, B_, B_, '#e41e20'),
    flag: [['fill', '#e41e20'], ['poly', '#1b1b1b', [[0.5, 0.2], [0.58, 0.34], [0.78, 0.28], [0.67, 0.48], [0.78, 0.68], [0.59, 0.62], [0.5, 0.82], [0.41, 0.62], [0.22, 0.68], [0.33, 0.48], [0.22, 0.28], [0.42, 0.34]]]] },
  { id: 'uzbekistan', name: tl('UZBEKISTAN'), short: 'UZB', level: 0,
    home: makeKit(W_, W_, W_, '#0099b5'), away: makeKit('#0099b5', '#0099b5', '#0099b5', W_),
    flag: [['h', ['#0099b5', '#ce1126', '#ffffff', '#ce1126', '#1eb53a'], [10, 1, 10, 1, 10]], ['crescent', '#ffffff', 0.15, 0.17, 0.12], ['dot', '#ffffff', 0.3, 0.1, 0.025], ['dot', '#ffffff', 0.36, 0.1, 0.025], ['dot', '#ffffff', 0.3, 0.22, 0.025], ['dot', '#ffffff', 0.36, 0.22, 0.025]] },
  { id: 'ghana', name: tl('GHANA'), short: 'GHA', level: 0,
    home: makeKit(W_, W_, W_, '#006b3f'), away: makeKit('#fcd116', B_, '#fcd116', B_),
    flag: [['h', ['#ce1126', '#fcd116', '#006b3f']], ['star', '#1b1b1b', 0.5, 0.5, 0.16]] },
  { id: 'southafrica', name: tl('SOUTH AFRICA'), short: 'RSA', level: 0,
    home: makeKit('#ffb81c', '#007a4d', '#ffb81c', '#007a4d'), away: makeKit(W_, '#007a4d', W_, '#007a4d'),
    flag: [['h', ['#e03c31', '#001489']], ['poly', '#ffffff', [[0, 0], [0.2, 0], [0.52, 0.34], [1, 0.34], [1, 0.66], [0.52, 0.66], [0.2, 1], [0, 1]]],
      ['poly', '#007749', [[0, 0.08], [0.1, 0], [0.48, 0.41], [1, 0.41], [1, 0.59], [0.48, 0.59], [0.1, 1], [0, 0.92]]], ['poly', '#ffb81c', [[0, 0.16], [0.33, 0.5], [0, 0.84]]], ['poly', '#1b1b1b', [[0, 0.25], [0.25, 0.5], [0, 0.75]]]] },
  { id: 'georgia', name: tl('GEORGIA'), short: 'GEO', level: 0,
    home: makeKit(W_, W_, W_, '#da291c'), away: makeKit('#da291c', B_, '#da291c', W_),
    flag: [['fill', '#ffffff'], ['cross', '#ff0000', 0.2], ['plus', '#ff0000', 0.2, 0.22, 0.2], ['plus', '#ff0000', 0.8, 0.22, 0.2], ['plus', '#ff0000', 0.2, 0.78, 0.2], ['plus', '#ff0000', 0.8, 0.78, 0.2]] },
  { id: 'jamaica', name: tl('JAMAICA'), short: 'JAM', level: 0,
    home: makeKit('#fed100', B_, '#fed100', '#009b3a'), away: makeKit(B_, B_, B_, '#fed100'),
    flag: [['fill', '#009b3a'], ['poly', '#1b1b1b', [[0, 0], [0.5, 0.5], [0, 1]]], ['poly', '#1b1b1b', [[1, 0], [0.5, 0.5], [1, 1]]], ['saltire', '#fed100', 0.16]] },
  { id: 'honduras', name: tl('HONDURAS'), short: 'HON', level: 0,
    home: makeKit(W_, W_, W_, '#0073cf'), away: makeKit('#0073cf', '#0073cf', '#0073cf', W_),
    flag: [['h', ['#0073cf', '#ffffff', '#0073cf']], ['star', '#0073cf', 0.5, 0.5, 0.06], ['star', '#0073cf', 0.38, 0.43, 0.06], ['star', '#0073cf', 0.38, 0.57, 0.06], ['star', '#0073cf', 0.62, 0.43, 0.06], ['star', '#0073cf', 0.62, 0.57, 0.06]] },
  { id: 'iceland', name: tl('ICELAND'), short: 'ISL', level: 0,
    home: makeKit('#02529c', '#02529c', '#02529c', '#dc1e35'), away: makeKit(W_, W_, W_, '#02529c'),
    flag: [['fill', '#02529c'], ['nordic', '#ffffff', 0.26], ['nordic', '#dc1e35', 0.13]] },
  { id: 'finland', name: tl('FINLAND'), short: 'FIN', level: 0,
    home: makeKit(W_, '#002f6c', W_, '#002f6c'), away: makeKit('#002f6c', '#002f6c', '#002f6c', W_),
    flag: [['fill', '#ffffff'], ['nordic', '#002f6c', 0.22]] },
  { id: 'newzealand', name: tl('NEW ZEALAND'), short: 'NZL', level: 0,
    home: makeKit(W_, B_, W_, B_), away: makeKit(B_, B_, B_, W_),
    flag: [['fill', '#012169'], ['rect', '#ffffff', 0.19, 0, 0.12, 0.5], ['rect', '#ffffff', 0, 0.19, 0.5, 0.12], ['rect', '#c8102e', 0.22, 0, 0.06, 0.5], ['rect', '#c8102e', 0, 0.22, 0.5, 0.06],
      ['star', '#ffffff', 0.76, 0.22, 0.1], ['star', '#c8102e', 0.76, 0.22, 0.065], ['star', '#ffffff', 0.88, 0.45, 0.1], ['star', '#c8102e', 0.88, 0.45, 0.065],
      ['star', '#ffffff', 0.65, 0.5, 0.1], ['star', '#c8102e', 0.65, 0.5, 0.065], ['star', '#ffffff', 0.76, 0.8, 0.1], ['star', '#c8102e', 0.76, 0.8, 0.065]] },
  { id: 'bosnia', name: tl('BOSNIA'), short: 'BIH', level: 0,
    home: makeKit('#002395', '#002395', '#002395', '#fecb00'), away: makeKit(W_, W_, W_, '#002395'),
    flag: [['fill', '#002395'], ['poly', '#fecb00', [[0.28, 0], [0.72, 0], [0.72, 1]]], ['star', '#ffffff', 0.24, 0.07, 0.05], ['star', '#ffffff', 0.3, 0.21, 0.05], ['star', '#ffffff', 0.36, 0.35, 0.05],
      ['star', '#ffffff', 0.42, 0.49, 0.05], ['star', '#ffffff', 0.48, 0.63, 0.05], ['star', '#ffffff', 0.55, 0.77, 0.05], ['star', '#ffffff', 0.61, 0.91, 0.05]] },
  { id: 'drcongo', name: tl('DR CONGO'), short: 'COD', level: 0,
    home: makeKit('#007fff', '#ce1021', '#007fff', '#f7d618'), away: makeKit(W_, '#007fff', W_, '#ce1021'),
    flag: [['fill', '#007fff'], ['poly', '#f7d618', [[0, 0.72], [0.82, 0], [1, 0], [1, 0.28], [0.18, 1], [0, 1]]], ['poly', '#ce1021', [[0, 0.84], [0.9, 0], [1, 0], [1, 0.16], [0.1, 1], [0, 1]]], ['star', '#f7d618', 0.16, 0.24, 0.15]] },
  { id: 'puertorico', name: tl('PUERTO RICO'), short: 'PUR', level: 0,
    home: makeKit('#ed0000', '#0050f0', W_, W_), away: makeKit(W_, '#0050f0', W_, '#ed0000'),
    flag: [['h', ['#ed0000', '#ffffff', '#ed0000', '#ffffff', '#ed0000']], ['tri', '#0050f0', 0.5], ['star', '#ffffff', 0.17, 0.5, 0.13]] },
  { id: 'dominicanrep', name: tl('DOMINICAN REP.'), short: 'DOM', level: 0,
    home: makeKit('#002d62', W_, '#002d62', '#ce1126'), away: makeKit(W_, '#ce1126', W_, '#002d62'),
    flag: [['fill', '#ffffff'], ['rect', '#002d62', 0, 0, 0.44, 0.42], ['rect', '#ce1126', 0.56, 0, 0.44, 0.42], ['rect', '#ce1126', 0, 0.58, 0.44, 0.42], ['rect', '#002d62', 0.56, 0.58, 0.44, 0.42], ['dot', '#1b7b3c', 0.5, 0.5, 0.08]] },
  // ---- twenty-five more, added with the crates
  { id: 'russia', name: tl('RUSSIA'), short: 'RUS', level: 1,
    home: makeKit('#d52b1e', W_, '#d52b1e', W_), away: makeKit(W_, '#0039a6', W_, '#d52b1e'),
    flag: [['h', ['#ffffff', '#0039a6', '#d52b1e']]] },
  { id: 'china', name: tl('CHINA'), short: 'CHN', level: 1,
    home: makeKit('#de2910', '#de2910', '#de2910', '#ffde00'), away: makeKit(W_, W_, W_, '#de2910'),
    flag: [['fill', '#de2910'], ['star', '#ffde00', 0.18, 0.28, 0.16], ['star', '#ffde00', 0.36, 0.14, 0.07], ['star', '#ffde00', 0.44, 0.26, 0.07], ['star', '#ffde00', 0.44, 0.42, 0.07], ['star', '#ffde00', 0.36, 0.54, 0.07]] },
  { id: 'india', name: tl('INDIA'), short: 'IND', level: 0,
    home: makeKit('#0057b7', '#0057b7', '#0057b7', '#ff9933'), away: makeKit('#ff9933', W_, '#ff9933', '#138808'),
    flag: [['h', ['#ff9933', '#ffffff', '#138808']], ['dot', '#000080', 0.5, 0.5, 0.09]] },
  { id: 'indonesia', name: tl('INDONESIA'), short: 'IDN', level: 0,
    home: makeKit('#ce1126', W_, '#ce1126', W_), away: makeKit(W_, '#ce1126', W_, '#ce1126'),
    flag: [['h', ['#ce1126', '#ffffff']]] },
  { id: 'thailand', name: tl('THAILAND'), short: 'THA', level: 0,
    home: makeKit('#241d4f', '#241d4f', '#241d4f', '#a51931'), away: makeKit(W_, W_, W_, '#241d4f'),
    flag: [['h', ['#a51931', '#ffffff', '#241d4f', '#ffffff', '#a51931'], [1, 1, 2, 1, 1]]] },
  { id: 'vietnam', name: tl('VIETNAM'), short: 'VIE', level: 0,
    home: makeKit('#da251d', '#da251d', '#da251d', '#ffff00'), away: makeKit(W_, '#da251d', W_, '#da251d'),
    flag: [['fill', '#da251d'], ['star', '#ffff00', 0.5, 0.5, 0.28]] },
  { id: 'philippines', name: tl('PHILIPPINES'), short: 'PHI', level: 0,
    home: makeKit('#0038a8', W_, '#0038a8', '#ce1126'), away: makeKit(W_, '#0038a8', W_, '#fcd116'),
    flag: [['h', ['#0038a8', '#ce1126']], ['poly', '#ffffff', [[0, 0], [0.42, 0.5], [0, 1]]], ['star', '#fcd116', 0.13, 0.5, 0.1]] },
  { id: 'kenya', name: tl('KENYA'), short: 'KEN', level: 0,
    home: makeKit('#006600', '#000000', '#006600', '#bb0000'), away: makeKit(W_, W_, W_, '#006600'),
    flag: [['h', ['#000000', '#bb0000', '#006600']], ['poly', '#ffffff', [[0.42, 0.14], [0.58, 0.14], [0.58, 0.86], [0.42, 0.86]]]] },
  { id: 'ethiopia', name: tl('ETHIOPIA'), short: 'ETH', level: 0,
    home: makeKit('#078930', '#078930', '#078930', '#fcdd09'), away: makeKit('#fcdd09', '#078930', '#fcdd09', '#da121a'),
    flag: [['h', ['#078930', '#fcdd09', '#da121a']], ['dot', '#0f47af', 0.5, 0.5, 0.2], ['star', '#fcdd09', 0.5, 0.5, 0.16]] },
  { id: 'zambia', name: tl('ZAMBIA'), short: 'ZAM', level: 0,
    home: makeKit('#198a00', '#198a00', '#198a00', '#ef7d00'), away: makeKit(W_, '#198a00', W_, '#ef7d00'),
    flag: [['fill', '#198a00'], ['rect', '#de2010', 0.6, 0.45, 0.13, 0.55], ['rect', '#000000', 0.73, 0.45, 0.13, 0.55], ['rect', '#ef7d00', 0.86, 0.45, 0.13, 0.55], ['dot', '#ef7d00', 0.78, 0.22, 0.14]] },
  { id: 'zimbabwe', name: tl('ZIMBABWE'), short: 'ZIM', level: 0,
    home: makeKit('#ffd200', '#006400', '#ffd200', '#de2010'), away: makeKit('#006400', '#006400', '#006400', '#ffd200'),
    flag: [['h', ['#006400', '#ffd200', '#de2010', '#000000', '#de2010', '#ffd200', '#006400']], ['poly', '#ffffff', [[0, 0], [0.34, 0.5], [0, 1]]], ['star', '#de2010', 0.11, 0.5, 0.13]] },
  { id: 'angola', name: tl('ANGOLA'), short: 'ANG', level: 0,
    home: makeKit('#ce1126', '#000000', '#ce1126', '#f9d616'), away: makeKit(W_, W_, W_, '#ce1126'),
    flag: [['h', ['#ce1126', '#000000']], ['star', '#f9d616', 0.5, 0.5, 0.15]] },
  { id: 'iraq', name: tl('IRAQ'), short: 'IRQ', level: 0,
    home: makeKit(W_, W_, W_, '#007a3d'), away: makeKit('#007a3d', '#007a3d', '#007a3d', W_),
    flag: [['h', ['#ce1126', '#ffffff', '#000000']], ['star', '#007a3d', 0.5, 0.5, 0.1]] },
  { id: 'jordan', name: tl('JORDAN'), short: 'JOR', level: 0,
    home: makeKit(W_, W_, W_, '#007a3d'), away: makeKit('#ce1126', '#000000', '#ce1126', W_),
    flag: [['h', ['#000000', '#ffffff', '#007a3d']], ['poly', '#ce1126', [[0, 0], [0.4, 0.5], [0, 1]]], ['star', '#ffffff', 0.14, 0.5, 0.09]] },
  { id: 'oman', name: tl('OMAN'), short: 'OMA', level: 0,
    home: makeKit('#db161b', '#db161b', '#db161b', W_), away: makeKit(W_, '#008000', W_, '#db161b'),
    flag: [['h', ['#ffffff', '#db161b', '#008000']], ['rect', '#db161b', 0, 0, 0.3, 1]] },
  { id: 'bolivia', name: tl('BOLIVIA'), short: 'BOL', level: 0,
    home: makeKit('#007934', '#007934', '#007934', '#fbe122'), away: makeKit(W_, '#007934', W_, '#d52b1e'),
    flag: [['h', ['#d52b1e', '#fbe122', '#007934']]] },
  { id: 'guatemala', name: tl('GUATEMALA'), short: 'GUA', level: 0,
    home: makeKit('#4997d0', W_, '#4997d0', W_), away: makeKit(W_, '#4997d0', W_, '#4997d0'),
    flag: [['v', ['#4997d0', '#ffffff', '#4997d0']], ['dot', '#4997d0', 0.5, 0.5, 0.11]] },
  { id: 'elsalvador', name: tl('EL SALVADOR'), short: 'SLV', level: 0,
    home: makeKit('#0f47af', W_, '#0f47af', W_), away: makeKit(W_, '#0f47af', W_, '#0f47af'),
    flag: [['h', ['#0f47af', '#ffffff', '#0f47af']], ['dot', '#fcd116', 0.5, 0.5, 0.1]] },
  { id: 'cuba', name: tl('CUBA'), short: 'CUB', level: 0,
    home: makeKit('#002a8f', W_, '#002a8f', '#cf142b'), away: makeKit(W_, '#002a8f', W_, '#cf142b'),
    flag: [['h', ['#002a8f', '#ffffff', '#002a8f', '#ffffff', '#002a8f']], ['poly', '#cf142b', [[0, 0], [0.4, 0.5], [0, 1]]], ['star', '#ffffff', 0.13, 0.5, 0.11]] },
  { id: 'haiti', name: tl('HAITI'), short: 'HAI', level: 0,
    home: makeKit('#00209f', '#00209f', '#00209f', '#d21034'), away: makeKit('#d21034', '#00209f', '#d21034', W_),
    flag: [['h', ['#00209f', '#d21034']], ['rect', '#ffffff', 0.36, 0.34, 0.28, 0.32]] },
  { id: 'trinidad', name: tl('TRINIDAD'), short: 'TRI', level: 0,
    home: makeKit('#ce1126', '#ce1126', '#ce1126', '#000000'), away: makeKit(W_, '#000000', W_, '#ce1126'),
    flag: [['fill', '#ce1126'], ['poly', '#ffffff', [[0, 0], [0.26, 0], [1, 1], [0.74, 1]]], ['poly', '#000000', [[0.05, 0], [0.21, 0], [1, 0.9], [1, 1], [0.95, 1]]]] },
  { id: 'estonia', name: tl('ESTONIA'), short: 'EST', level: 0,
    home: makeKit('#0072ce', '#000000', '#0072ce', W_), away: makeKit(W_, W_, W_, '#0072ce'),
    flag: [['h', ['#0072ce', '#000000', '#ffffff']]] },
  { id: 'latvia', name: tl('LATVIA'), short: 'LVA', level: 0,
    home: makeKit('#9e3039', '#9e3039', '#9e3039', W_), away: makeKit(W_, '#9e3039', W_, '#9e3039'),
    flag: [['h', ['#9e3039', '#ffffff', '#9e3039'], [2, 1, 2]]] },
  { id: 'lithuania', name: tl('LITHUANIA'), short: 'LTU', level: 0,
    home: makeKit('#fdb913', '#006a44', '#fdb913', '#c1272d'), away: makeKit(W_, '#006a44', W_, '#fdb913'),
    flag: [['h', ['#fdb913', '#006a44', '#c1272d']]] },
  { id: 'bulgaria', name: tl('BULGARIA'), short: 'BUL', level: 0,
    home: makeKit(W_, '#00966e', W_, '#d62612'), away: makeKit('#00966e', '#00966e', '#00966e', W_),
    flag: [['h', ['#ffffff', '#00966e', '#d62612']]] },
];
// ===== CLUB CAREER: thirty pro teams, one for every city the big American league plays in
// Made up, on purpose. The league's team names, logos and uniforms belong to it and its teams, so
// these are named after their cities with a word of their own, and wear similar colours: the way
// sports games without a licence have always done it, as obvious as that allows (the city, the
// colours, and on the badge a symbol the city is known for). js/crests.js draws the badges; none
// copies a real logo, and there are no letters or monograms on them. `stars` (2..5) is how big the
// team is: it sets what it pays and how hard its bots play (`level` 0..3, like a country's).
// (Identifiers still say "euro" from when these were European football clubs.)
// crest: { shape, split, cols: [field, second colour, trim], emblem, …} — see js/crests.js, which draws it
function euroClub(id, name, short, city, country, stars, home, away, crest) {
  return { id, name, short, city, country, stars, level: Math.max(0, Math.min(3, stars - 2)), home, away, euro: true, crest };
}
const EURO_CLUBS = [
  // the East
  euroClub('bostongreen', 'Boston Green', 'BOS', 'BOSTON', 'usa', 5, makeKit('#007a33', '#007a33', W_, W_), makeKit(W_, W_, W_, '#007a33'),
    { shape: 'round', split: 'plain', cols: ['#007a33', '#007a33', '#ba9653'], rim: W_, text: 'BOSTON', tc: '#007a33', emblem: 'shamrock', ec: W_ }),
  euroClub('brooklynblack', 'Brooklyn Black', 'BKN', 'BROOKLYN', 'usa', 3, makeKit(W_, W_, B_, B_), makeKit(B_, B_, B_, W_),
    { shape: 'round', split: 'plain', cols: [B_, B_, W_], rim: W_, text: 'BROOKLYN', tc: B_, emblem: 'hoop', ec: W_ }),
  euroClub('newyorkempire', 'New York Empire', 'NYE', 'NEW YORK', 'usa', 4, makeKit('#006bb6', '#006bb6', '#f58426', '#f58426'), makeKit(W_, W_, W_, '#f58426', { sleeves: '#006bb6' }),
    { shape: 'round', split: 'plain', cols: ['#006bb6', '#006bb6', '#f58426'], rim: '#f58426', text: 'NEW YORK', tc: W_, emblem: 'tower', ec: '#f58426' }),
  euroClub('philadelphiabells', 'Philadelphia Bells', 'PHI', 'PHILADELPHIA', 'usa', 4, makeKit('#006bb6', '#006bb6', W_, '#ed174c'), makeKit(W_, W_, W_, '#ed174c', { sleeves: '#006bb6' }),
    { shape: 'round', split: 'plain', cols: ['#006bb6', '#006bb6', '#ed174c'], rim: '#ed174c', text: 'PHILADELPHIA', tc: W_, emblem: 'bell', ec: '#d9a441' }),
  euroClub('torontoclaws', 'Toronto Claws', 'TOR', 'TORONTO', 'canada', 4, makeKit(B_, B_, '#ce1141', '#ce1141', { sleeves: '#b4975a' }), makeKit(W_, W_, W_, '#ce1141'),
    { shape: 'shield', split: 'plain', cols: ['#ce1141', '#ce1141', B_], rim: '#a1a1a4', emblem: 'claw', ec: W_, text: 'TORONTO', rc: '#a1a1a4' }),
  euroClub('chicagohorns', 'Chicago Horns', 'CHI', 'CHICAGO', 'usa', 4, makeKit('#ce1141', '#ce1141', B_, B_), makeKit(W_, W_, W_, '#ce1141', { sleeves: B_ }),
    { shape: 'round', split: 'plain', cols: [W_, W_, '#ce1141'], rim: '#ce1141', text: 'CHICAGO', tc: W_, emblem: 'bull', ec: '#ce1141' }),
  euroClub('clevelandwine', 'Cleveland Wine', 'CLE', 'CLEVELAND', 'usa', 3, makeKit('#860038', '#860038', '#fdbb30', '#fdbb30'), makeKit(W_, W_, W_, '#860038', { sleeves: '#fdbb30' }),
    { shape: 'shield', split: 'plain', cols: ['#860038', '#860038', '#fdbb30'], rim: '#041e42', emblem: 'anchor', ec: '#fdbb30', text: 'CLEVELAND', rc: '#fdbb30' }),
  euroClub('detroitmotors', 'Detroit Motors', 'DET', 'DETROIT', 'usa', 3, makeKit('#c8102e', '#c8102e', '#1d42ba', '#1d42ba'), makeKit(W_, W_, W_, '#1d42ba', { sleeves: '#c8102e' }),
    { shape: 'round', split: 'plain', cols: ['#1d42ba', '#1d42ba', '#c8102e'], rim: '#c8102e', text: 'DETROIT', tc: W_, emblem: 'gear', ec: '#bec0c2' }),
  euroClub('indianagold', 'Indiana Gold', 'IND', 'INDIANAPOLIS', 'usa', 3, makeKit('#002d62', '#002d62', '#fdbb30', '#fdbb30'), makeKit('#fdbb30', '#fdbb30', '#fdbb30', '#002d62'),
    { shape: 'shield', split: 'plain', cols: ['#002d62', '#002d62', '#fdbb30'], rim: '#fdbb30', emblem: 'flag', ec: W_, text: 'INDIANA', rc: '#fdbb30' }),
  euroClub('milwaukeeantlers', 'Milwaukee Antlers', 'MIL', 'MILWAUKEE', 'usa', 5, makeKit('#00471b', '#00471b', '#eee1c6', '#eee1c6'), makeKit('#eee1c6', '#eee1c6', '#eee1c6', '#00471b'),
    { shape: 'round', split: 'plain', cols: ['#00471b', '#00471b', '#eee1c6'], rim: '#0077c0', text: 'MILWAUKEE', tc: W_, emblem: 'stag', ec: '#eee1c6' }),
  euroClub('atlantared', 'Atlanta Red', 'ATL', 'ATLANTA', 'usa', 3, makeKit('#e03a3e', '#e03a3e', W_, '#c1d32f'), makeKit(W_, W_, W_, '#e03a3e', { sleeves: '#c1d32f' }),
    { shape: 'round', split: 'plain', cols: ['#e03a3e', '#e03a3e', '#c1d32f'], rim: '#26282a', text: 'ATLANTA', tc: W_, emblem: 'bird', ec: W_ }),
  euroClub('charlotteteal', 'Charlotte Teal', 'CHA', 'CHARLOTTE', 'usa', 2, makeKit('#00788c', '#00788c', W_, '#1d1160'), makeKit('#1d1160', '#1d1160', '#1d1160', '#00788c'),
    { shape: 'shield', split: 'plain', cols: ['#00788c', '#00788c', '#1d1160'], rim: '#1d1160', emblem: 'hornet', ec: '#1d1160', plate: W_, text: 'CHARLOTTE', rc: '#a1a1a4' }),
  euroClub('miamiflame', 'Miami Flame', 'MIA', 'MIAMI', 'usa', 4, makeKit('#98002e', '#98002e', B_, '#f9a01b'), makeKit(B_, B_, B_, '#98002e', { sleeves: '#f9a01b' }),
    { shape: 'round', split: 'plain', cols: [B_, B_, '#98002e'], rim: '#98002e', text: 'MIAMI', tc: W_, emblem: 'flame', ec: '#f9a01b' }),
  euroClub('orlandostars', 'Orlando Stars', 'ORL', 'ORLANDO', 'usa', 3, makeKit('#0077c0', '#0077c0', B_, '#c4ced4'), makeKit(W_, W_, W_, '#0077c0', { sleeves: B_ }),
    { shape: 'round', split: 'plain', cols: [B_, B_, '#0077c0'], rim: '#0077c0', text: 'ORLANDO', tc: W_, emblem: 'star', ec: '#c4ced4' }),
  euroClub('washingtonnavy', 'Washington Navy', 'WAS', 'WASHINGTON', 'usa', 2, makeKit('#002b5c', '#002b5c', '#e31837', '#e31837'), makeKit(W_, W_, W_, '#e31837', { sleeves: '#002b5c' }),
    { shape: 'shield', split: 'plain', cols: ['#002b5c', '#002b5c', '#e31837'], rim: '#c4ced4', emblem: 'eagle', ec: W_, text: 'WASHINGTON', rc: '#e31837', rtc: W_ }),
  // the West
  euroClub('denverpeaks', 'Denver Peaks', 'DEN', 'DENVER', 'usa', 5, makeKit('#0e2240', '#0e2240', '#fec524', '#fec524'), makeKit(W_, W_, W_, '#0e2240', { sleeves: '#fec524' }),
    { shape: 'round', split: 'plain', cols: ['#0e2240', '#0e2240', '#fec524'], rim: '#fec524', text: 'DENVER', tc: '#0e2240', emblem: 'peak', ec: '#4f8ad8' }),
  euroClub('minnesotapines', 'Minnesota Pines', 'MIN', 'MINNEAPOLIS', 'usa', 4, makeKit('#0c2340', '#0c2340', '#78be20', '#78be20'), makeKit(W_, W_, W_, '#236192', { sleeves: '#78be20' }),
    { shape: 'shield', split: 'plain', cols: ['#236192', '#236192', '#78be20'], rim: '#0c2340', emblem: 'tree', ec: '#78be20', text: 'MINNESOTA', rc: '#9ea2a2' }),
  euroClub('okcskies', 'Oklahoma City Skies', 'OKC', 'OKLAHOMA CITY', 'usa', 5, makeKit('#007ac1', '#007ac1', '#ef3b24', '#ef3b24'), makeKit(W_, W_, W_, '#007ac1', { sleeves: '#ef3b24' }),
    { shape: 'round', split: 'plain', cols: ['#007ac1', '#007ac1', '#fdbb30'], rim: '#ef3b24', text: 'OKLAHOMA', tc: W_, emblem: 'bolt', ec: '#fdbb30' }),
  euroClub('portlandroses', 'Portland Roses', 'PDX', 'PORTLAND', 'usa', 3, makeKit('#e03a3e', '#e03a3e', B_, B_), makeKit(B_, B_, B_, '#e03a3e'),
    { shape: 'round', split: 'plain', cols: [B_, B_, '#e03a3e'], rim: '#e03a3e', text: 'PORTLAND', tc: W_, emblem: 'rose', ec: '#e03a3e' }),
  euroClub('utahcanyons', 'Utah Canyons', 'UTA', 'SALT LAKE CITY', 'usa', 2, makeKit('#c4501e', '#c4501e', '#2b1d4f', '#2b1d4f'), makeKit(W_, W_, W_, '#c4501e', { sleeves: '#2b1d4f' }),
    { shape: 'shield', split: 'plain', cols: ['#2b1d4f', '#2b1d4f', '#c4501e'], rim: '#c4501e', emblem: 'arch', ec: '#e0703a', text: 'UTAH', rc: '#c4501e', rtc: W_ }),
  euroClub('goldenstatebridges', 'Golden State Bridges', 'GSB', 'SAN FRANCISCO', 'usa', 5, makeKit('#1d428a', '#1d428a', '#ffc72c', '#ffc72c'), makeKit(W_, W_, W_, '#1d428a', { sleeves: '#ffc72c' }),
    { shape: 'round', split: 'plain', cols: ['#1d428a', '#1d428a', '#ffc72c'], rim: '#ffc72c', text: 'GOLDEN STATE', tc: '#1d428a', emblem: 'bridge', ec: '#ffc72c' }),
  euroClub('lasails', 'Los Angeles Sails', 'LAS', 'LOS ANGELES', 'usa', 3, makeKit(W_, W_, '#1d428a', '#c8102e', { sleeves: '#1d428a' }), makeKit('#1d428a', '#1d428a', '#1d428a', '#c8102e'),
    { shape: 'round', split: 'plain', cols: ['#1d428a', '#1d428a', '#c8102e'], rim: '#c8102e', text: 'LOS ANGELES', tc: W_, emblem: 'ship', ec: W_ }),
  euroClub('lagold', 'Los Angeles Gold', 'LAG', 'LOS ANGELES', 'usa', 5, makeKit('#fdb927', '#fdb927', '#552583', '#552583'), makeKit('#552583', '#552583', '#552583', '#fdb927'),
    { shape: 'round', split: 'plain', cols: ['#552583', '#552583', '#fdb927'], rim: '#fdb927', text: 'LOS ANGELES', tc: '#552583', emblem: 'ball', ec: '#fdb927' }),
  euroClub('phoenixdesert', 'Phoenix Desert', 'PHX', 'PHOENIX', 'usa', 3, makeKit('#1d1160', '#1d1160', '#e56020', '#e56020'), makeKit(W_, W_, W_, '#e56020', { sleeves: '#1d1160' }),
    { shape: 'round', split: 'plain', cols: ['#1d1160', '#1d1160', '#e56020'], rim: '#e56020', text: 'PHOENIX', tc: W_, emblem: 'sun', ec: '#f9ad1b' }),
  euroClub('sacramentocrowns', 'Sacramento Crowns', 'SAC', 'SACRAMENTO', 'usa', 2, makeKit('#5a2d81', '#5a2d81', B_, '#c4ced4'), makeKit(W_, W_, W_, '#5a2d81', { sleeves: '#63727a' }),
    { shape: 'shield', split: 'plain', cols: ['#5a2d81', '#5a2d81', '#63727a'], rim: '#63727a', emblem: 'crown', ec: '#c4ced4', text: 'SACRAMENTO', rc: '#63727a', rtc: W_ }),
  euroClub('dallasstallions', 'Dallas Stallions', 'DAL', 'DALLAS', 'usa', 4, makeKit('#00538c', '#00538c', '#002b5e', '#b8c4ca'), makeKit(W_, W_, W_, '#00538c', { sleeves: '#002b5e' }),
    { shape: 'round', split: 'plain', cols: ['#00538c', '#00538c', '#b8c4ca'], rim: '#002b5e', text: 'DALLAS', tc: W_, emblem: 'horse', ec: W_ }),
  euroClub('houstonorbit', 'Houston Orbit', 'HOU', 'HOUSTON', 'usa', 4, makeKit('#ce1141', '#ce1141', '#c4ced4', '#c4ced4'), makeKit(W_, W_, W_, '#ce1141', { sleeves: '#c4ced4' }),
    { shape: 'round', split: 'plain', cols: ['#26282a', '#26282a', '#ce1141'], rim: '#ce1141', text: 'HOUSTON', tc: W_, emblem: 'rocket', ec: '#c4ced4' }),
  euroClub('memphisblues', 'Memphis Blues', 'MEM', 'MEMPHIS', 'usa', 3, makeKit('#5d76a9', '#5d76a9', '#12173f', '#f5b112'), makeKit('#12173f', '#12173f', '#12173f', '#5d76a9'),
    { shape: 'round', split: 'plain', cols: ['#12173f', '#12173f', '#5d76a9'], rim: '#f5b112', text: 'MEMPHIS', tc: '#12173f', emblem: 'note', ec: '#7d97cf' }),
  euroClub('neworleansbayou', 'New Orleans Bayou', 'NOB', 'NEW ORLEANS', 'usa', 2, makeKit('#0c2340', '#0c2340', '#c8102e', '#85714d'), makeKit(W_, W_, W_, '#0c2340', { sleeves: '#c8102e' }),
    { shape: 'shield', split: 'plain', cols: ['#0c2340', '#0c2340', '#85714d'], rim: '#c8102e', emblem: 'lily', ec: '#c9b27c', text: 'NEW ORLEANS', rc: '#85714d', rtc: W_ }),
  euroClub('sanantoniosilver', 'San Antonio Silver', 'SAS', 'SAN ANTONIO', 'usa', 4, makeKit(B_, B_, '#c4ced4', '#c4ced4'), makeKit(W_, W_, W_, B_, { sleeves: '#c4ced4' }),
    { shape: 'round', split: 'plain', cols: [B_, B_, '#c4ced4'], rim: '#c4ced4', text: 'SAN ANTONIO', tc: B_, emblem: 'spur', ec: '#c4ced4' }),
];
const EURO_IDS = new Set(EURO_CLUBS.map((c) => c.id));
const isEuro = (id) => EURO_IDS.has(typeof id === 'string' ? id : id && id.id);

const DEFAULT_CLUB = 'argentina';
// accounts made when the league was clubs play for that club's country
const OLD_CLUB_COUNTRY = {
  realmadrid: 'spain', barcelona: 'spain', atletico: 'spain', mancity: 'england', liverpool: 'england', arsenal: 'england',
  chelsea: 'england', manutd: 'england', tottenham: 'england', newcastle: 'england', astonvilla: 'england',
  bayern: 'germany', leverkusen: 'germany', dortmund: 'germany', psg: 'france', inter: 'italy', juventus: 'italy',
  milan: 'italy', napoli: 'italy', benfica: 'portugal',
};
const countryFor = (id) => (CLUBS.some((c) => c.id === id) ? id : OLD_CLUB_COUNTRY[id] || DEFAULT_CLUB);
// flat colour a white/yellow kit uses wherever white UI text sits on it
const kitUi = (kit) => (colorLum(kit.jersey) > 0.7 ? shadeHex(kit.jersey === W_ ? '#8a90b8' : kit.jersey, -0.35) : kit.jersey);
const clubUi = (club) => kitUi(club.home);

const KEEPER_COLORS = ['#3fcf4a', '#ffc21a', '#ff8a1f', '#a35cff', '#46d9ff', '#ff5fa8', '#2b2d42'];

const Clubs = {
  current: null, home: null,
  // a country or a club: everything that draws a team takes either
  get(id) { return CLUBS.find((c) => c.id === id) || EURO_CLUBS.find((c) => c.id === id) || CLUBS[0]; },
  valid(id) { return CLUBS.some((c) => c.id === id) || EURO_IDS.has(id); },
  // Club Career is switched on (Save.data.arena 'club') and there is a club you play for
  clubMode() { return typeof Save !== 'undefined' && !!Save.data && Save.data.arena === 'club' && !!this.career(); },
  career() { const c = typeof Save !== 'undefined' && Save.data && Save.data.cc; return c && EURO_IDS.has(c.club) ? EURO_CLUBS.find((x) => x.id === c.club) : null; },
  // the country your account plays for (the league, the World Cup), whichever side you are on
  country() { return CLUBS.find((c) => c.id === ((typeof Save !== 'undefined' && Save.data && Save.data.club) || DEFAULT_CLUB)) || CLUBS[0]; },
  // who you are on the pitch right now: your club in Club Career, otherwise your country
  mine() { return (this.clubMode() && this.career()) || this.country(); },
  // the teams there are to play against right now: the clubs in Club Career, otherwise the countries
  pool() { return this.clubMode() ? EURO_CLUBS : CLUBS; },
  random(...except) { const ids = new Set(except.filter(Boolean).map((c) => typeof c === 'string' ? c : c.id)); const all = this.pool(); const pool = all.filter((c) => !ids.has(c.id)); return pick(pool.length ? pool : all); },

  // Kits for two clubs on one pitch: the home side wears its home kit, the away side
  // switches to its away kit when the two would be hard to tell apart.
  kitsFor(home, away) {
    const hk = home.home;
    let ak = away.home;
    // (a second colour over half the shirt counts as much as the shirt itself)
    const second = (k) => k.halves || k.diag || k.hoops || null;
    const clash = (a, b) => colorDist(a.jersey, b.jersey) < 110 || (a.stripes && b.stripes && colorDist(a.stripes, b.stripes) < 110) || (a.checks && b.checks)
      || (second(a) && colorDist(second(a), b.jersey) < 110) || (second(b) && colorDist(second(b), a.jersey) < 110)
      || (second(a) && second(b) && colorDist(second(a), second(b)) < 110);
    if (home.id === away.id || clash(hk, ak)) ak = away.away;
    if (clash(hk, ak)) ak = colorLum(hk.jersey) > 0.5 ? makeKit(B_, B_, B_, W_) : makeKit(W_, W_, W_, B_);
    // keepers: the colour furthest from both outfield kits, and not the same as each other
    const extra = (k, c) => Math.min(...['stripes', 'checks', 'sleeves', 'hoops', 'halves', 'diag', 'center', 'band', 'sash'].map((x) => (k[x] ? colorDist(c, k[x]) : 999)));
    const score = (c) => Math.min(colorDist(c, hk.jersey), colorDist(c, ak.jersey), extra(hk, c), extra(ak, c));
    const ranked = KEEPER_COLORS.slice().sort((a, b) => score(b) - score(a));
    const gk = (c) => ({ jersey: c, shade: shadeHex(c, -0.22), accent: colorLum(c) > 0.6 ? '#1b1d33' : '#ffffff', shorts: '#1b1d33', socks: c, shoes: '#1b1d33', gloves: '#ffffff' });
    return { home: hk, away: ak, homeKeeper: gk(ranked[0]), awayKeeper: gk(ranked[1]), awayAlt: ak !== away.home };
  },

  // Paint the blue slot (your side) and the red slot (the other side) everywhere.
  setMatch(home, away) {
    this.home = home; this.current = away;
    const k = this.kitsFor(home, away);
    const fill = (slot, club, kit) => {
      for (const key of ['stripes', 'sleeves', 'center', 'checks', 'hoops', 'halves', 'diag', 'band', 'sash', 'hi']) delete TEAMS[slot][key];
      Object.assign(TEAMS[slot], kit, { name: club.name, short: club.short });
    };
    fill('blue', home, k.home);
    fill('red', away, k.away);
    Object.assign(KEEPER_KITS.blue, k.homeKeeper);
    Object.assign(KEEPER_KITS.red, k.awayKeeper);
    delete KEEPER_KITS.blue.hi; delete KEEPER_KITS.red.hi;
    if (typeof document !== 'undefined') {
      const root = document.documentElement.style;
      root.setProperty('--home', kitUi(k.home)); root.setProperty('--home-d', shadeHex(kitUi(k.home), -0.25));
      root.setProperty('--red', kitUi(k.away)); root.setProperty('--red-d', shadeHex(kitUi(k.away), -0.25));
      const key = home.id + '/' + away.id + '/' + (typeof Seasons !== 'undefined' ? Seasons.now() : '');
      if (typeof Render !== 'undefined' && Render.ctx && Render.layerClub !== key) Render.buildLayer();
    }
  },
  // old single-club entry point: your club against this one
  apply(club) { this.setMatch(this.mine(), club); },
};

if (typeof module !== 'undefined') module.exports = { CLUBS, EURO_CLUBS, DEFAULT_CLUB, countryFor };
