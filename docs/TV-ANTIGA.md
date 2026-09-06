# A TV da casa é um Chrome de 2016

A TV Samsung da sala roda um Chrome ~47 (Tizen de 2016). Ele lê **quase** todo o ES6,
mas falta um pedaço. E o que falta não dá erro pequeno: o browser **para de ler o arquivo
inteiro** e a tela fica branca, sem mensagem nenhuma.

Isso vale para tudo que roda no browser: `shared/*.js`, `games/*/tv.js`, `games/*/phone.js`
e os `<script>` dentro de `public/*.html`. O servidor (`server.js`, `games/*/game.js`) roda
no Node e não tem essa limitação.

## O que NÃO pode aparecer nesses arquivos

| Não pode | Escreva assim |
|---|---|
| `let` / `const` / `class` sem modo estrito | `'use strict';` como primeira instrução do arquivo |
| `function f(a = 1)` (parâmetro padrão) | `function f(a) { if (a === undefined) a = 1;` |
| `const { a } = obj` (desestruturação) | `const a = obj.a;` |
| `const [x, y] = arr` | `const x = arr[0], y = arr[1];` |
| `function f(...xs)` (rest) | use `arguments` |
| `catch {` (sem variável) | `catch (err) {` |
| `async` / `await` | `.then()` |
| `{ ...obj }` (spread de objeto) | `Object.assign({}, obj)` |
| `a ** b` | `Math.pow(a, b)` |
| `for (x of el.querySelectorAll(…))`, `[...lista]`, `lista.forEach` | `Array.prototype.slice.call(el.querySelectorAll(…))` |
| `padStart`, `Object.values`, `Object.entries` | zero à esquerda na mão; `Object.keys(o).map(k => o[k])` |
| `var(--cor)` no CSS (a TV **ignora a declaração inteira**) | escreva o valor. Precisa mesmo de `var()`? Ponha o valor fixo antes, na mesma regra, e marque a linha com `/* tv-ok */` |

## O que PODE, porque o Chrome 47 tem

Arrow function, template string (crase), `for...of`, propriedade abreviada, `Map`, `Set`,
`Promise`, `Object.assign`, spread em array (`[...x]`) e em chamada (`f(...x)`), e `class`
(desde que o arquivo esteja em modo estrito).

## CSS: a regra de ouro é "valor fixo primeiro, moderno depois"

O Chrome 47 descarta a declaração que não entende e fica com a anterior; os browsers novos usam a
última. Então dá para manter o visual moderno sem perder a TV:

```css
font-size:22px; font-size:clamp(14px,1.4vw,22px); /* tv-ok */
width:26vw; height:26vw; aspect-ratio:1;   @supports (aspect-ratio:1) { .x { height:auto; } }
```

**Cuidado com a regra "moderna": ela não é ignorada inteira.** O Chrome 47 joga fora só a
declaração que não entende e **guarda as outras da mesma regra**. Então nunca ponha, na linha
`tv-ok`, uma declaração que a TV entende e que desfaz o valor de reserva:

```css
/* errado: a TV descarta grid e gap, mas fica com o margin-bottom:0 e perde a reserva */
.nums { display:flex; flex-wrap:wrap; margin-bottom:-5px; }
.nums { display:grid; gap:5px; margin-bottom:0; }        /* tv-ok */

/* certo: o que desfaz a reserva vai para dentro do @supports */
.nums { display:flex; flex-wrap:wrap; margin-bottom:-5px; }
.nums { display:grid; gap:5px; }                          /* tv-ok */
@supports (display:grid) { .nums { margin-bottom:0; } }
```

`calc()` a TV tem. Use para o fallback bater no pixel com o grid: 10 colunas com 5px de vão é
`width:calc((100% - 45px) / 10)`.

| A TV não lê | Faça |
|---|---|
| `var(--x)`, `#0008` / `#ffffff2e` (hex com alfa), `rgb(0 0 0 / .5)` | valor escrito, `rgba(0,0,0,.5)` |
| `clamp()`, `min()`, `max()` | valor calculado para 1920×1080 antes (1vw = 19.2px) + a linha moderna com `tv-ok` |
| `aspect-ratio` | altura explícita antes; devolva com `@supports (aspect-ratio:1)` |
| `gap` em flex (TVs até ~2020 também não têm) | margens nos filhos: `.a > * + * { margin-left:12px }` |
| `display:grid` | `flex` com `flex-wrap` e larguras em % |
| `inset` | `top/left/right/bottom` |
| `filter` | `-webkit-filter` antes, mesmo valor |
| `conic-gradient` | `linear-gradient` antes + linha do cônico com `tv-ok` |
| `place-items`, `backdrop-filter`, `mix-blend-mode`, `dvh`, `:is()`, `:has()`, `translate:` solto | equivalente antigo ou tire |

Tamanhos em `vw`/`vh` funcionam na TV e escalam igual em 4K. Cores por elemento (crachá, aviso) o JS
escreve inline em vez de usar variável.

## Como conferir antes de subir

O verificador lê cada arquivo e aponta a linha exata do problema:

```
node test/tv-compat.js
```

Ele confere o que a TV carrega: `shared/*.js`, `games/*/tv.js`, `public/tv.html` e `shared/ui.css`.
Tudo que a TV não lê é erro (✗), inclusive CSS que só desalinha: a tela tem que ficar igual à do
computador. Linha marcada com `tv-ok` é aceita (use só quando o valor fixo já está antes).
Sem instalar nada ele confere por texto; com `npm i -D acorn acorn-walk` a conferência é exata.

Para VER como a TV vê sem ter a TV: um proxy que apaga do CSS o que o Chrome 47 descarta e serve o
resto igual. Está no histórico desta sessão como `tvsim.js` (porta 3006 → 3005); vale recriar se
precisar. O Chrome moderno olhando pelo proxy mostra, na prática, o que a TV mostra. Ele também
apaga os blocos `@supports` cujo teste o Chrome 47 reprova — sem isso o proxy mente.

Conferido assim em 2026-09-06: nos 9 jogos a tela da TV antiga ficou igual à do computador
(diferença só nos dígitos do relógio, que mudam entre uma foto e outra).

## Se a TV ficar branca mesmo assim

A página `/tv` tem uma caixa vermelha no canto de baixo que mostra o navegador e qualquer
erro de script. Ela existe porque a TV não tem console. A primeira linha diz qual arquivo
e qual linha quebrou.
