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

No CSS o cuidado é parecido. Erro de verdade (some a declaração): `var(--x)`. Só desalinha,
mas desalinha em TV até ~2020: `grid`, `gap` em flex, `inset`, `clamp()`, `aspect-ratio`,
`place-items`, `mix-blend-mode`, `backdrop-filter`. Use `flex` com margens e valores fixos.
`filter` precisa também de `-webkit-filter`.

## Como conferir antes de subir

O verificador lê cada arquivo e aponta a linha exata do problema:

```
node test/tv-compat.js
```

Ele confere o que a TV carrega: `shared/*.js`, `games/*/tv.js`, `public/tv.html` e `shared/ui.css`.
Erro (✗) é o que deixa a tela branca ou quebra o jogo. Aviso (⚠) é CSS que só desalinha.
Sem instalar nada ele confere por texto; com `npm i -D acorn acorn-walk` a conferência é exata.

## Se a TV ficar branca mesmo assim

A página `/tv` tem uma caixa vermelha no canto de baixo que mostra o navegador e qualquer
erro de script. Ela existe porque a TV não tem console. A primeira linha diz qual arquivo
e qual linha quebrou.
