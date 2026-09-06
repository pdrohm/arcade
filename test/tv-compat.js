// Confere se o código que roda no browser cabe na TV da casa (Chrome ~47, Samsung 2016).
// Um só desses erros faz o browser parar de ler o arquivo inteiro: a TV fica branca e
// não avisa nada. Ver docs/TV-ANTIGA.md.
//
//   node test/tv-compat.js
//
// Sem argumentos, confere o que a TV carrega: shared/*.js, games/*/tv.js, public/tv.html e shared/ui.css.
// (phone.js e index.html rodam em celular moderno e ficam de fora.)
// Uma linha com o comentário tv-ok é aceita: use quando a linha de cima já tem o valor fixo de reserva.
// Com `acorn` instalado (npm i -D acorn acorn-walk) a conferência é exata; sem ele, cai
// num modo simples por texto, que pega os casos comuns mas pode deixar passar algum.
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const IGNORAR = ['games/kart/', 'shared/kart/', 'shared/game3d/'];   // 3D não roda nessa TV de qualquer jeito

function alvos() {
  const out = [];
  for (const f of fs.readdirSync(path.join(RAIZ, 'shared'))) if (f.endsWith('.js')) out.push('shared/' + f);
  const jogos = path.join(RAIZ, 'games');
  for (const dir of fs.readdirSync(jogos)) {
    const rel = 'games/' + dir + '/tv.js';
    if (fs.existsSync(path.join(RAIZ, rel))) out.push(rel);
  }
  out.push('public/tv.html');
  return out.filter(f => !IGNORAR.some(x => f.startsWith(x)));
}

// Um HTML entra na conferência pelo maior <script> sem src (o script de tela).
function fonte(rel) {
  const txt = fs.readFileSync(path.isAbsolute(rel) ? rel : path.join(RAIZ, rel), 'utf8');
  if (!rel.endsWith('.html')) return txt;
  const blocos = txt.match(/<script>([\s\S]*?)<\/script>/g) || [];
  if (!blocos.length) return '';
  return blocos.map(b => b.replace(/^<script>/, '').replace(/<\/script>$/, '')).sort((a, b) => b.length - a.length)[0];
}

function carregar(nome) { try { return require(nome); } catch (err) { return null; } }
const acorn = carregar('acorn'), walk = carregar('acorn-walk');

// Funções que só existem em Chrome mais novo que o da TV. Não são erro de leitura:
// o arquivo carrega e quebra na hora de usar, o que é ainda mais difícil de achar.
const METODOS_NOVOS = Object.assign(Object.create(null), {
  padStart: 'Chrome 57', padEnd: 'Chrome 57', trimStart: 'Chrome 66', trimEnd: 'Chrome 66',
  flat: 'Chrome 69', flatMap: 'Chrome 69', matchAll: 'Chrome 73', replaceAll: 'Chrome 85',
  at: 'Chrome 92', toSorted: 'Chrome 110', toReversed: 'Chrome 110', findLast: 'Chrome 97',
  append: 'Chrome 54', prepend: 'Chrome 54', replaceChildren: 'Chrome 86', toggleAttribute: 'Chrome 69',
  finally: 'Chrome 63', allSettled: 'Chrome 76', any: 'Chrome 85', randomUUID: 'Chrome 92', replaceWith: 'Chrome 54',
});
const GLOBAIS_NOVOS = Object.assign(Object.create(null), {
  'Object.entries': 'Chrome 54', 'Object.values': 'Chrome 54', 'Object.fromEntries': 'Chrome 73',
  'Array.flat': 'Chrome 69', 'globalThis': 'Chrome 71', 'structuredClone': 'Chrome 98',
  'queueMicrotask': 'Chrome 71', 'BigInt': 'Chrome 67', 'ResizeObserver': 'Chrome 64',
  'IntersectionObserver': 'Chrome 51', 'AbortController': 'Chrome 66', 'Proxy': 'Chrome 49', 'Reflect': 'Chrome 49',
  'URLSearchParams': 'Chrome 49', 'Object.getOwnPropertyDescriptors': 'Chrome 54',
});

const NOMES = {
  AssignmentPattern: 'parâmetro padrão (x = 1)',
  ObjectPattern: 'desestruturação { }',
  ArrayPattern: 'desestruturação [ ]',
  RestElement: 'parâmetro rest (...args)',
  AwaitExpression: 'await',
};

function conferirAst(src) {
  const falhas = [];
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true }); }
  catch (e) { return [{ linha: '?', o_que: 'o arquivo nem foi lido: ' + e.message }]; }
  const add = (n, o_que) => falhas.push({ linha: n && n.loc ? n.loc.start.line : '?', o_que });
  // Um global novo pode ser usado desde que o código pergunte antes se ele existe.
  const usoProtegido = new Set();
  const protegidos = new Set();
  walk.full(ast, n => {
    if (n.type === 'BinaryExpression' && n.operator === 'in' && n.left.type === 'Literal') protegidos.add(n.left.value);
    if (n.type === 'UnaryExpression' && n.operator === 'typeof' && n.argument.type === 'Identifier') protegidos.add(n.argument.name);
    if (n.type === 'MemberExpression' && n.object.type === 'Identifier' && n.object.name === 'window' && n.property.name) protegidos.add(n.property.name);
  });
  walk.full(ast, n => { if (n.type === 'Identifier' && protegidos.has(n.name)) usoProtegido.add(n); });
  walk.full(ast, n => {
    if (NOMES[n.type]) add(n, NOMES[n.type]);
    if (n.type === 'CatchClause' && !n.param) add(n, 'catch sem variável');
    if ((n.type === 'FunctionDeclaration' || n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression') && n.async) add(n, 'função async');
    if (n.type === 'BinaryExpression' && n.operator === '**') add(n, 'operador **');
    if (n.type === 'ObjectExpression') for (const p of n.properties) if (p.type === 'SpreadElement') add(p, 'spread de objeto { ...x }');
    if (n.type === 'ImportDeclaration' || n.type === 'ExportNamedDeclaration') add(n, 'import/export (módulo ES)');
    if (n.type === 'ChainExpression') add(n, 'encadeamento opcional (?.)');
    if (n.type === 'LogicalExpression' && n.operator === '??') add(n, 'operador ??');
    if (n.type === 'AssignmentExpression' && ['??=', '||=', '&&='].indexOf(n.operator) >= 0) add(n, 'atribuição ' + n.operator);
    // chamada de método novo: x.padStart(...)
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && !n.callee.computed && METODOS_NOVOS[n.callee.property.name])
      add(n, n.callee.property.name + '() só existe a partir do ' + METODOS_NOVOS[n.callee.property.name]);
    // uso de global novo: Object.entries, globalThis, ResizeObserver…
    if (n.type === 'MemberExpression' && !n.computed && n.object.type === 'Identifier') {
      const nome = n.object.name + '.' + (n.property.name || '');
      if (GLOBAIS_NOVOS[nome]) add(n, nome + ' só existe a partir do ' + GLOBAIS_NOVOS[nome]);
    }
    if (n.type === 'Identifier' && GLOBAIS_NOVOS[n.name] && !usoProtegido.has(n)) add(n, n.name + ' só existe a partir do ' + GLOBAIS_NOVOS[n.name]);
    // NodeList (querySelectorAll, children…) não é iterável nem tem forEach no Chrome 47
    const ehLista = x => x && (
      (x.type === 'CallExpression' && x.callee.type === 'MemberExpression' && /^(querySelectorAll|getElementsBy\w+)$/.test(x.callee.property.name || '')) ||
      (x.type === 'MemberExpression' && /^(children|childNodes)$/.test(x.property.name || '')));
    if (n.type === 'ForOfStatement' && ehLista(n.right)) add(n, 'for...of numa NodeList (use Array.prototype.slice.call)');
    if (n.type === 'SpreadElement' && ehLista(n.argument)) add(n, '[...NodeList] (use Array.prototype.slice.call)');
    if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression' && n.callee.property.name === 'forEach' && ehLista(n.callee.object)) add(n, 'NodeList.forEach (use Array.prototype.slice.call)');
    // var(--x) dentro de string de estilo: o Chrome 47 ignora a declaração inteira
    const semTvOk = txt => txt.split('\n').filter(l => /var\(--/.test(l) && !/tv-ok/.test(l)).length > 0;
    if (n.type === 'TemplateElement' && semTvOk(n.value.raw)) add(n, 'var(--…) em CSS: a TV ignora a declaração inteira; escreva o valor (ou valor fixo antes + tv-ok)');
    if (n.type === 'Literal' && typeof n.value === 'string' && semTvOk(n.value)) add(n, 'var(--…) em CSS: a TV ignora a declaração inteira; escreva o valor (ou valor fixo antes + tv-ok)');
  });
  return falhas;
}

// Modo simples (sem acorn): procura os padrões mais comuns linha a linha.
const PADROES = [
  [/\bcatch\s*\{/, 'catch sem variável'],
  [/\basync\b/, 'função async'],
  [/\bawait\b/, 'await'],
  [/\{\s*\.\.\./, 'spread de objeto { ...x }'],
  [/(^|[^*/])\*\*[^*]/, 'operador **'],
  [/\b(const|let|var)\s*[{[]/, 'desestruturação'],
  [/\bfunction\s*[A-Za-z0-9_$]*\s*\([^)]*[A-Za-z0-9_$]\s*=[^=>)]/, 'parâmetro padrão (x = 1)'],
  [/^\s*(import|export)\s/, 'import/export (módulo ES)'],
  [/\?\./, 'encadeamento opcional (?.)'],
  [/\?\?/, 'operador ??'],
  [/\.(padStart|padEnd|flat|flatMap|matchAll|replaceAll|trimStart|trimEnd|findLast)\(/, 'função só existente em Chrome novo'],
  [/\bObject\.(entries|values|fromEntries)\(/, 'Object.entries/values/fromEntries (Chrome 54+)'],
  [/\bglobalThis\b|\bstructuredClone\(/, 'global só existente em Chrome novo'],
  [/for\s*\((const|let|var)\s+\w+\s+of\s+[^)]*(querySelectorAll|getElementsBy|\.children|\.childNodes)/, 'for...of numa NodeList'],
  [/\[\.\.\.[^\]]*(querySelectorAll|getElementsBy|\.children|\.childNodes)/, '[...NodeList]'],
  [/(querySelectorAll|getElementsBy\w+)\([^)]*\)\.forEach|\.(children|childNodes)\.forEach/, 'NodeList.forEach'],
  [/var\(--/, 'var(--…) em CSS'],
];
function conferirTexto(src) {
  const falhas = [];
  src.split('\n').forEach((linha, i) => {
    if (/tv-ok/.test(linha)) return;
    // Array.prototype.slice.call(...) já transforma a NodeList em array: percorrer é seguro.
    const limpa = linha.replace(/\/\/.*$/, '').replace(/Array\.prototype\.slice\.call\([^;]*\)/g, 'LISTA');
    for (const [re, o_que] of PADROES) if (re.test(limpa)) falhas.push({ linha: i + 1, o_que });
  });
  return falhas;
}

const TEM_STRICT = /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*|\s)*['"]use strict['"];/;
const USA_BLOCO = /(^|[^.\w])(let|const|class)[\s({[]/;

// CSS: var() é erro (a declaração some); o resto só desalinha, então é aviso.
const CSS_ERRO = [[/var\(--/, 'var(--…): a TV ignora a declaração inteira'],
  [/[:\s,(]#[0-9a-fA-F]{4}(?![0-9a-fA-F])|[:\s,(]#[0-9a-fA-F]{8}(?![0-9a-fA-F])/, 'cor #rgba / #rrggbbaa: a TV ignora a declaração inteira; use rgba()'],
  [/conic-gradient/, 'conic-gradient: a TV não tem; ponha um linear-gradient antes e marque tv-ok']];
const CSS_AVISO = [];   // hoje nada é só aviso: o que a TV não lê deixa a tela diferente do computador
CSS_ERRO.push(
  [/display:\s*grid/, 'grid (a TV não tem): use flex com larguras em %'],
  [/(^|[^-\w])(row-|column-)?gap:/, 'gap (a TV não tem, nem TVs até ~2020): margens nos filhos'],
  [/(^|[^-\w])inset(-inline|-block)?:/, 'inset: use top/left/right/bottom'],
  [/place-(items|content|self):/, 'place-*: use align-* e justify-*'],
  [/clamp\(|(^|[^-\w.])min\(|(^|[^-\w.])max\(/, 'clamp()/min()/max(): ponha o valor calculado para 1920×1080 antes e marque tv-ok'],
  [/aspect-ratio:/, 'aspect-ratio: ponha a altura explícita antes e devolva com @supports (aspect-ratio:1)'],
  [/backdrop-filter/, 'backdrop-filter: a TV não tem; tire'],
  [/^(?![\s\S]*-webkit-filter)[\s\S]*(^|[^-\w])filter:/, 'filter: precisa de -webkit-filter: com o mesmo valor na linha (ou tv-ok se já tem)'],
  [/\d(dvh|svh|lvh|dvw|svw|lvw)\b/, 'unidade dvh/svh: a TV não tem; use vh'],
  [/:is\(|:where\(|:has\(/, ':is()/:where()/:has(): a TV não tem'],
  [/(^|[^-\w])(translate|rotate|scale):/, 'translate:/rotate:/scale: soltos: use transform:'],
  [/(inline-size|block-size|margin-(inline|block)|padding-(inline|block)|border-(inline|block))/, 'propriedade lógica: a TV não tem; use width/height/margin-left…'],
  [/display:\s*contents/, 'display:contents: a TV não tem'],
  [/rgba?\([^)]*\//, 'rgb(r g b / a): a TV só lê rgba(r,g,b,a)'],
  [/overflow:\s*clip/, 'overflow:clip: use hidden'],
  [/text-wrap:/, 'text-wrap: a TV não tem'],
  [/position:\s*sticky/, 'position:sticky: a TV não tem'],
  [/(^|[^-])background-clip:\s*text/, 'background-clip:text precisa de -webkit-background-clip'],
);
function conferirCss(src) {
  const erros = [], avisos = [];
  src.split('\n').forEach((linha, i) => {
    // @supports é a própria rede de proteção: dentro dele o moderno é intencional.
    if (/tv-ok/.test(linha) || /body\.phone/.test(linha) || /@supports/.test(linha)) return;
    const l = linha.replace(/\/\*.*?\*\//g, '');
    for (const [re, o_que] of CSS_ERRO) if (re.test(l)) erros.push({ linha: i + 1, o_que });
    for (const [re, o_que] of CSS_AVISO) if (re.test(l)) avisos.push({ linha: i + 1, o_que });
  });
  return { erros, avisos };
}

function main() {
  const lista = process.argv.length > 2 ? process.argv.slice(2) : alvos();
  let ruins = 0;
  // folha de estilo comum
  if (process.argv.length <= 2) {
    const css = conferirCss(fs.readFileSync(path.join(RAIZ, 'shared/ui.css'), 'utf8'));
    if (css.erros.length) { ruins++; console.log('\n✗ shared/ui.css'); for (const f of css.erros) console.log('   linha ' + f.linha + ': ' + f.o_que); }
    if (css.avisos.length) { console.log('\n⚠ shared/ui.css (só desalinha na TV, não quebra):'); for (const f of css.avisos) console.log('   linha ' + f.linha + ': ' + f.o_que); }
  }
  for (const rel of lista) {
    const src = fonte(rel);
    if (!src.trim()) continue;
    if (rel.endsWith('.css')) {   // folha de estilo passada na mão
      const css = conferirCss(src);
      if (css.erros.length) { ruins++; console.log('\n✗ ' + rel); for (const f of css.erros) console.log('   linha ' + f.linha + ': ' + f.o_que); }
      continue;
    }
    const falhas = acorn && walk ? conferirAst(src) : conferirTexto(src);
    const avisos = [];
    const reBloco = /<style>[\s\S]*?<\/style>|const style = `[\s\S]*?`|style="[^"]*"|style:'[^']*'/g;
    let m;
    while ((m = reBloco.exec(src))) {
      const base = src.slice(0, m.index).split('\n').length;
      const r = conferirCss(m[0]);
      for (const f of r.avisos) avisos.push(f.o_que);
      for (const f of r.erros) falhas.push({ linha: base + f.linha - 1, o_que: f.o_que });
    }
    if (avisos.length && rel.endsWith('tv.js')) console.log('\n⚠ ' + rel + ' (CSS que só desalinha na TV): ' + [...new Set(avisos)].join(', '));
    if (USA_BLOCO.test(src) && !TEM_STRICT.test(src)) falhas.push({ linha: 1, o_que: "falta 'use strict'; no topo (sem ele a TV recusa todo let/const do arquivo)" });
    if (!falhas.length) continue;
    ruins++;
    console.log('\n✗ ' + rel);
    for (const f of falhas.sort((a, b) => a.linha - b.linha)) console.log('   linha ' + f.linha + ': ' + f.o_que);
  }
  if (!acorn || !walk) console.log('\n(conferência simples, por texto. Para a exata: npm i -D acorn acorn-walk)');
  if (ruins) {
    console.log('\n' + ruins + ' arquivo(s) que a TV da casa não consegue ler. Ver docs/TV-ANTIGA.md.');
    process.exit(1);
  }
  console.log('✅ ' + lista.length + ' arquivo(s) conferido(s): a TV da casa consegue ler todos.');
}
main();
