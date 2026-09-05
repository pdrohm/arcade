# Arcade da casa

Um servidor, uma porta, vários jogos. A TV mostra a prateleira de jogos. Cada pessoa entra pelo celular, escolhe uma cor e um nome, e essa identidade vale em todos os jogos.

## Rodar

```bash
cd arcade
npm install
npm start
```

Porta padrão: 3000 (mude com `PORT=3040 npm start`). O terminal mostra os links:

- TV: `http://IP:3000/tv`
- Celulares: `http://IP:3000/`

A TV mostra um QR code com o endereço do Wi-Fi. Para jogar também de fora, suba com `PUBLIC_URL=https://seu-endereco/ npm start` (túnel ou domínio).

### Dois caminhos até a mesma sala

Com `PUBLIC_URL`, a TV mostra **dois** QR codes lado a lado:

| QR | Caminho | Latência |
|---|---|---|
| 📶 Aqui no Wi-Fi | celular → servidor, direto | ~4 ms |
| 🌍 De qualquer lugar | celular → túnel → servidor | ~100 ms |

Quem está na sala escaneia o primeiro e nem sai da rede de casa. Quem está longe usa o segundo. Sem `PUBLIC_URL`, só aparece o do Wi-Fi.

## Salas

Um servidor serve várias salas ao mesmo tempo. Cada sala tem um código de 4 letras, seus próprios jogadores e seu próprio jogo.

- A TV abre `/tv`, ganha uma sala (ex.: `ABCD`) e passa a ficar em `/tv/ABCD`. O QR já leva para `/ABCD`.
- O celular entra por `/ABCD` (QR) ou digita o código em `/`. Sem TV por perto, "Criar uma sala nova" no celular também funciona.
- Duas TVs = duas salas = dois jogos diferentes ao mesmo tempo.
- Uma sala sem ninguém conectado por 3 horas some sozinha. Recarregar a TV em `/tv/ABCD` reabre a sala com o mesmo código.

## Como funciona

1. Cada pessoa entra pelo celular e escolhe uma cor livre. A ordem de entrada é a ordem de jogo.
2. Qualquer um toca num jogo da prateleira para começar.
3. No fim (ou a qualquer momento) dá para voltar à prateleira e trocar de jogo. Os jogadores continuam os mesmos.

O que o núcleo já resolve para todos os jogos:

- **Identidade fixa:** cada celular tem um id no navegador. Recarregar a tela não muda nada. Trocar de navegador também não: basta usar o mesmo nome.
- **Tela bloqueada não é queda.** Só depois de 2 minutos sem sinal aparece 📵. Aí qualquer jogador pode remover o fantasma com o ✕.
- **Tela sempre acesa** (Wake Lock) e reconexão automática ao destravar.
- **Cronômetro** compartilhado: o jogo pede `api.armTimer(ms)` e recebe `onTimeUp()`.
- **Salvamento:** todas as salas em `state.json`. Se o servidor cair, volta de onde parou, inclusive a partida.
- **Nomes em destaque:** todo nome aparece com a cor do jogador em qualquer frase.

## Jogos que já existem

| Pasta | Jogo |
|---|---|
| `games/imagemeacao` | Imagem e Ação — equipes, dado, desenho e cronômetro |
| `games/perfil` | Perfil — 20 dicas, mediador, carta bônus e ficha azul. 5 categorias (Pessoa, Lugar, Coisa, Ano, Série ou Filme) e 400+ cartas em lotes `cardsN.js` (qualquer arquivo novo nessa pasta entra sozinho) |
| `games/telefone` | Telefone Sem Fio — escreva, desenhe, descreva; álbum no fim (quadro de desenho no celular) |
| `games/stop` | Stop (Adedonha) — menu de regras (rodadas, tempo, categorias, letras), roleta de letras, STOP e conferência com veto |
| `games/provavel` | Quem é mais provável? — pergunta na TV, votos no celular, barras e coroa |
| `games/stopalfabeto` | Stop Alfabeto — uma categoria, o alfabeto na TV; fala a palavra, aperta a letra, 5 s por vez, 3 vidas, contestação por votação |
| `games/uno` | UNO — mão no celular, mesa na TV, coringa, +2/+4, UNO! e "Pegou!", pontuação oficial |
| `games/palavrasecreta` | Palavra Secreta — todo mundo recebe a mesma palavra, menos o impostor; dicas, discussão, votação e chance final |

## Adicionar um jogo novo

Crie `games/<id>/` com três arquivos. O servidor acha sozinho na próxima vez que subir.

```
games/meujogo/
  game.js    # regras (roda no servidor)
  tv.js      # tela da TV
  phone.js   # tela do celular
```

**`game.js`** exporta `meta` e `create(api)`:

```js
module.exports = {
  meta: {
    id: 'meujogo', name: 'Meu Jogo', emoji: '🎲',
    tagline: 'Uma frase curta para o card da prateleira.',
    art: 'linear-gradient(135deg,#0ea5e9,#082f49)',   // fundo do card
    minPlayers: 2, maxPlayers: 8,
  },
  create(api) {
    let s = { fase: 'inicio' };                        // estado só deste jogo
    return {
      start() { api.setEvent('Começou!'); },           // ao abrir o jogo
      action(player, msg) { /* mensagens dos celulares */ },
      onTimeUp() { /* o cronômetro acabou */ },
      view(me, tipo) { return { ...s }; },             // o que cada tela recebe
      serialize: () => s,                              // salvar
      restore(d) { s = { ...s, ...d }; },              // restaurar
      rekey(velhoPid, novoPid) {},                     // trocou de celular
      onPlayerLeave(pid) {},                           // saiu da sala
    };
  },
};
```

A `api` entregue ao jogo tem: `players`, `byPid`, `colorInfo`, `onlinePids`, `setEvent`, `addEvent`, `armTimer`, `clearTimer`, `timerEnd`, `broadcast` e `exit`.

**`tv.js` e `phone.js`** registram as telas:

```js
ARCADE.register('meujogo', {
  tv:    { mount(c) { return '<div>…</div>'; },  // opcional: palco fixo, montado uma vez
           html(c) { return { side: '…' }; },     // painel da direita
           after(c) { /* animações, avisos */ } },
  phone: { html(c) { return '…'; },
           act(a, el, c) { /* botões [data-a] */ },
           after(c) { /* avisos em tela cheia */ } },
});
```

O contexto `c` traz `S`, `C` (núcleo), `G` (a visão do seu jogo), `you`, `send`, `esc`, `nm`, `hl`, `playersHtml`, `timerHtml`, `turnover`, `beep` e `chord`. O visual comum está em `shared/ui.css`: use as classes `box`, `btn`, `pl`, `badge`, `nm`, `timer`.
# arcade
