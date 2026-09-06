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

## O que PODE, porque o Chrome 47 tem

Arrow function, template string (crase), `for...of`, propriedade abreviada, `Map`, `Set`,
`Promise`, `Object.assign`, spread em array (`[...x]`) e em chamada (`f(...x)`), e `class`
(desde que o arquivo esteja em modo estrito).

No CSS o cuidado é parecido: nada de `grid`, `gap` em flex, `inset`, `place-items`,
`color-mix` sem cor de reserva, nem `mix-blend-mode`. Use `flex` com margens.

## Como conferir antes de subir

O verificador lê cada arquivo e aponta a linha exata do problema:

```
node test/tv-compat.js
```

Ele roda sozinho junto com `npm test`. Se passar, a TV consegue ler os arquivos.

## Se a TV ficar branca mesmo assim

A página `/tv` tem uma caixa vermelha no canto de baixo que mostra o navegador e qualquer
erro de script. Ela existe porque a TV não tem console. A primeira linha diz qual arquivo
e qual linha quebrou.
