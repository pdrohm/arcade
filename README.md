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

## Instalar no celular

O controle também funciona como PWA, um site instalado com ícone e tela própria.

- **Android:** abra o Arcade no Chrome e toque em **Instalar** no aviso da tela.
- **iPhone:** abra no Safari, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**.

Em produção, use um endereço com HTTPS. `localhost` também funciona para testes. Um endereço `http://IP` da rede local pode abrir o controle, mas o navegador não libera a instalação da PWA.

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
| `games/kart` | KART — corrida 2.5D de 3 voltas e batalha de 2 minutos, 2–4 pilotos, controles no celular e tela dividida na TV (Canvas 2D, roda em TV antiga) |
| `games/imagemeacao` | Imagem e Ação — equipes, dado e cronômetro; quem faz a carta escolhe desenhar (quadro no celular, ao vivo na TV) ou mímica |
| `games/perfil` | Perfil — 20 dicas, mediador, carta bônus e ficha azul. 5 categorias (Pessoa, Lugar, Coisa, Ano, Série ou Filme) e 400+ cartas em lotes `cardsN.js` (qualquer arquivo novo nessa pasta entra sozinho) |
| `games/telefone` | Telefone Sem Fio — escreva, desenhe, descreva; álbum no fim (quadro de desenho no celular) |
| `games/stop` | Stop (Adedonha) — menu de regras (rodadas, tempo, categorias, letras), roleta de letras, STOP e conferência com veto |
| `games/provavel` | Quem é mais provável? — pergunta na TV, votos no celular, barras e coroa |
| `games/amigosdemerda` | Amigos de Merda — no estilo do jogo da Buró: quem é da vez compra a carta, todo mundo aponta no celular (em si mesmo não vale) e o mais apontado fica com ela. Empate: quem não votou nos empatados pode trocar, depois quem leu desempata. Quem junta 5 cartas (ou 3/7) é coroado; cartas sacanas opcionais |
| `games/decisoesdemerda` | Decisões de Merda — no estilo do jogo da Buró: quem é da vez vira uma carta com duas opções ruins; os outros escolhem em segredo e quem é da vez aposta no que a maioria vai escolher (opção 1, opção 2 ou empate). Acertou, ganha 1 ponto. Meta de 3 pontos (ou 5/7); cartas sacanas opcionais |
| `games/stopalfabeto` | Stop Alfabeto — uma categoria, o alfabeto na TV; fala a palavra, aperta a letra, 5 s por vez, 3 vidas, contestação por votação |
| `games/uno` | UNO — mão no celular, mesa na TV, coringa, +2/+4, UNO! e "Pegou!", pontuação oficial |
| `games/pife` | Pife (Cacheta) — 2–10 pessoas, mão privada no celular, compra do monte ou descarte, três jogos de três cartas e opção de partida com ou sem coringas |
| `games/truco` | Truco Paulista, Mineiro e Gaudério — 2 pessoas ou 4 em duplas, mão privada no celular e mesa pública na TV. O Gaudério usa 40 cartas espanholas (Espadas, Bastos, Ouros e Copas), envido e flor |
| `games/tefode` | Te F0d3 (f*dinha) — 4–7 pessoas, palpites de vazas, carta na testa nas rodadas de uma carta, cartas iguais que se anulam e eliminação por penalidades |
| `games/impostor` | Impostor — todo mundo recebe a mesma palavra, menos o(s) impostor(es); com ou sem dica; dicas, discussão, votação e chance final |
| `games/palavrasecreta` | Palavra Secreta — estilo Mega Senha: em times, um vê a palavra e dá dicas em voz alta, o colega adivinha; ACERTOU/PASSAR no celular, cronômetro e placar na TV |
| `games/ultimodepe` | Último de Pé — memória espacial e ação simultânea, 2–8. 🐧 Pinguins (dash com força no gelo, quem cai na água sai) ou 🤠 Tiroteio (todo mundo atira junto). O servidor resolve a rodada; celular em tela cheia |
| `games/top10` | Top 10 — um ranking de dez que ninguém vê. Cada um fala um item na ordem; quem duvidar do anterior revela a lista, a turma vota e alguém perde uma das 4 vidas. Com TV ou só nos celulares, e com um celular só no modo mediador |
| `games/cratecrush` | Crate Crush — briga em arena estilo Crash Bash, 1–4 + CPU: pegue e jogue caixas, TNT com 3-2-1, Nitro, chute e pulo. Jungle, Space (buracos no chão), Snow (gelo e pinguim) e Drain Bash (armas) |
| `games/polarpush` | Polar Push — empurra-empurra de urso no gelo, 1–4 + CPU: investida com medidor, contra-ataque, pendurado na borda. Polar, Tilt (gangorra e morsa), Melt (ilha derretendo) e Manic Panic (bombas) |
| `games/pogo` | Pogo Pandemonium — conquista de casas num tabuleiro 8×8, 1–4 + CPU: pinte e pegue a caixa "!" para guardar os pontos. Pogo Painter, Pogo-a-Gogo (laços), El Pogo Loco (dinamite) e Pogo Padlock (cadeado) |
| `games/ballistix` | Ballistix — pong de 4 gols, 1–4 + CPU: cada um defende um lado, chute e turbo, bolas cada vez mais rápidas e numerosas. Crashball, Beach Ball (ímã), N. Ballism (canhão e escudo) e Sky Balls (plataforma inclina) |

No Truco, o Paulista usa mão de onze e sequência 1→3→6→9→12; o Mineiro usa mão de dez e sequência 2→4→6→10→12. O Gaudério vai até 12 pontos (ou 24, escolhido no celular), com truco, retruco, vale quatro, envido e flor. O baralho espanhol contém 1–7, Sota (10), Cavalo (11) e Rei (12), sem 8 e 9.

A arte das cartas espanholas vem de [Baraja española completa.png](https://commons.wikimedia.org/wiki/File:Baraja_espa%C3%B1ola_completa.png), com crédito e licença em [public/cards/spanish/ATTRIBUTION.md](public/cards/spanish/ATTRIBUTION.md). No fim de cada vaza, a mesa segura as cartas por alguns segundos para mostrar o resultado.

No Te F0d3, o [regulamento da UFSC](https://caeca.ufsc.br/regulamentos/Fodinha.pdf) define 5 penalidades, limite de cartas por número de pessoas e retorno a 1 carta após o limite. O [texto complementar](https://faltadecriatividadeefogo.blogspot.com/2016/02/fodinha.html) define a vira, as manilhas e as cartas iguais que se anulam. A pontuação é só no jogo, sem ações ligadas a bebida.

## Jogos de fora (jogo de navegador de outro site)

`games/skate3` abre o Skate 3 (fan game em WebGPU) na TV e o celular vira um controle de Xbox. O servidor faz de proxy em `/ext/<id>/` (sempre para o site fixo do jogo) e `shared/ext/inject.js` cria controles virtuais que o jogo lê por `navigator.getGamepads()`. Para outro jogo, crie só `games/<id>/game.js`:

```js
module.exports = require('../../shared/ext/game')({ id: 'meujogo', name: 'Meu Jogo', upstream: 'https://site-do-jogo', pads: 2, needs: 'webgpu' });
```

`pads` é quantos celulares jogam juntos; quem sobra escolhe no celular quem fica com o controle. A TV precisa ser um computador com Chrome atual, aberto em https ou `localhost` (o WebGPU não liga em `http://192.168…`). O código do site do jogo roda no endereço do arcade: só use sites de confiança.

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


## KART (2.5D)

Use a mesma sala: abra `/tv`, entre pelo QR nos celulares e escolha **KART**.
O primeiro piloto escolhe **CORRIDA** ou **BATALHA**. Cada piloto escolhe personagem,
kart e **ESTOU PRONTO**. O primeiro piloto toca **LARGAR**.

- A TV desenha em Canvas 2D, no estilo dos jogos de corrida dos anos 90: não precisa de WebGL e roda no navegador da TV da sala. Os celulares não carregam o desenho.
- O celular vira um controle na **horizontal** (em pé, ele pede para virar). Polegar esquerdo no
  volante analógico: pouco movimento vira pouco, até o fim vira tudo. Polegar direito: **DRIFT**, **ITEM** e **TURBO**.
- Segure **A** para acelerar. Segure **DRIFT** entrando na curva: a derrapagem trava o lado da curva,
  o botão vai enchendo e, ao soltar com carga, sai um turbo. **ITEM** usa o item que só o seu celular mostra;
  **TURBO** tem um tempo de recarga.
- Vibração (quando o celular tem): pegou item, usou item, bateu, turbo de derrapagem.
- Dois pilotos usam duas câmeras. Três ou quatro usam uma grade na mesma tela.
- Depois do resultado, use **JOGAR DE NOVO** ou volte para a biblioteca. Nomes e cores ficam na sala.
- Uma queda breve de conexão freia o kart; voltar ao celular recupera o mesmo lugar.
- Depois de reiniciar o servidor, uma partida em andamento volta à preparação. Resultados concluídos são mantidos.

Nada de biblioteca 3D: sprites e texturas são pintados em canvas na hora, sem imagens no servidor.
O mesmo `Dockerfile` já copia as pastas necessárias. Não é preciso outro servidor de jogo.

### Testar

```bash
npm test
npm run test:kart:e2e
```

O primeiro comando testa regras e conexões. O segundo também dirige uma corrida completa
por WebSocket e espera uma batalha de 2 minutos terminar, sem acelerar o relógio.
Os testes usam salas e arquivos de estado temporários; não alteram `state.json`.

Arquitetura e limites: [docs/KART-ARCHITECTURE.md](docs/KART-ARCHITECTURE.md).

### Extensões opcionais para jogos em tempo real

Jogos antigos mantêm seu contrato. Um jogo novo pode usar:

- `input(player, msg)`: recebe mensagens `t: 'input'` da própria vaga autenticada sem salvar ou transmitir a sala inteira.
  Essas mensagens têm um limite de ritmo próprio no servidor (`INPUT_RATE`, 45/s), separado do limite geral de 20/s.
- `api.stream()`: envia a visão privada de cada tela em `game-frame`; conexões lentas pulam quadros antigos.
- `tvAction(msg)`: recebe mensagens da tela de TV, como a confirmação de que o desenho carregou.
- `destroy()`: encerra recursos ao sair, trocar de jogo ou remover a sala.
- `tv.frame(c)` / `phone.frame(c)`: atualizam quadros rápidos sem substituir o DOM.
- `tv.destroy()` / `phone.destroy()`: removem renderizadores, eventos e controles ao sair.

As transições de fase continuam usando `api.broadcast()`. A tela do celular pode usar `key(c)`
para manter botões e toques durante atualizações. Nunca salve teclas pressionadas em `serialize()`.

## Top 10

Para 2 a 8 pessoas, com a TV ligada ou só com os celulares — a tela do celular tem tudo:
título da carta, contador, lista revelada, votação e vidas. E dá para jogar com **um celular
só**, no modo mediador (mais abaixo).

- A tela mostra **só o título** de um ranking de dez ("Os 10 rios mais longos do mundo").
  A lista fica escondida: ela nem sai do servidor antes da hora, nem para a TV.
- Na sua vez, você **fala em voz alta** um item que acha que está na lista e aperta **FALEI**.
  O jogo não confere nada: quem confere é a mesa.
- A carta **não para nos dez**. Enquanto ninguém duvidar, o rodízio continua — e a partir da
  décima resposta alguém ali está blefando.
- Qualquer jogador vivo pode apertar **DUVIDO** na última resposta, a qualquer momento, até o
  próximo responder. Aí a lista se revela e todo mundo (menos os dois envolvidos) vota se valia.
  Empate conta como "valia"; quem não votar é ignorado.
- **Em dupla** não sobra júri: os dois votam, com a lista à vista. Se discordarem, dá empate
  e a resposta vale — quem duvida é que tem de provar.
- **Valia?** Quem duvidou perde uma vida. **Não valia?** Quem falou perde. São 4 vidas
  (2 a 5 no menu de regras). Sem vidas você fica assistindo — mas continua votando nas duvidadas.
  Sobrou um, venceu.
- Com tempo por resposta ligado (padrão 20 s), quem não responde a tempo também perde uma vida
  e a lista se revela.
- **Carta repetida?** Qualquer um toca **⏭️ Pular a carta**, a qualquer momento — inclusive
  quem está na vez, e mesmo com respostas já ditas. Entra outra na hora, ninguém perde vida e a
  vez continua com quem estava para responder. Quem pulou aparece no aviso da sala.

### Modo mediador (um celular só)

No menu de regras dá para trocar "📱 Um celular por pessoa" por "🎙️ Modo mediador". Aí um
celular conduz a mesa inteira e ninguém mais precisa entrar na sala:

- O mediador digita os nomes de quem está jogando (2 a 8), na ordem da roda. Cada nome ganha
  uma cor e quatro vidas, igual a um jogador de celular.
- A tela mostra de quem é a vez. Quando a pessoa responde, o mediador toca **FALEI**.
- Gritaram "duvido"? O mediador toca **DUVIDARAM**, escolhe na lista **quem** duvidou, e a
  lista se revela. Sem votação: ele decide **✅ Valia / ❌ Não valia** com a lista à vista.
- O mediador pode se incluir na mesa e jogar também: em Top 10 ninguém vê a lista antes da
  revelação, então ele não leva vantagem nenhuma.
- Se houver outro celular na sala, ele mostra a mesma tela e também consegue tocar os botões —
  a bateria do mediador acabar não trava o jogo. Sair da sala também não derruba a mesa: os
  nomes são do jogo, não das vagas.

As cartas ficam em `games/top10/cards.js`, dez itens cada, na ordem do 1º ao 10º. Para
acrescentar é só continuar as listas: `{ t: 'título', s: 'fonte', items: [ …dez… ] }`.

## Último de Pé

Para 2 a 8 pessoas (quem sobra assiste). Party game de memória espacial: a decisão vem antes,
a ação acontece para todos no mesmo instante. Latência e clique rápido não dão vantagem.

- **Rodada:** MEMORIZE (todo mundo à vista) → os outros somem, só você se vê → escolha a
  direção → 3, 2, 1 → **JÁ!** (pinguins) ou **FOGO!** (tiroteio) → resultado → próxima rodada.
- **O MEMORIZE acompanha o ritmo da mesa:** decorar oito posições não é decorar duas, então a
  fase encurta conforme o povo cai. E, quando o resultado acabou de mostrar o mesmo tabuleiro
  (pinguins, que não embaralham), ela vira só uma conferida — o tiroteio, que espalha todo mundo
  de novo a cada rodada, mantém a janela inteira.
- **🐧 Pinguins:** arraste o dedo na arena. A direção é para onde você aponta; a **força** é a
  distância até o dedo (a seta mostra até onde você escorrega). Bateu, empurrou; caiu na água, saiu.
  O gelo derrete um pouco a cada rodada.
- **🤠 Tiroteio:** arraste para mirar. Todo mundo atira junto; o primeiro corpo no caminho leva a
  bala. Dois que se acertam caem juntos. Cada rodada todo mundo nasce num lugar novo.
- **Empate:** se todos os que restam saem na mesma rodada, eles jogam um desempate. Três desempates
  seguidos = vitória dividida.
- **Opção "mostrar todo mundo antes de cada rodada"** (na preparação): desligada, ninguém aparece
  antes da rodada. Só vale a memória.
- No celular a partida é em tela cheia (✕ sai do jogo, ⛶ pede tela cheia ao navegador).
  No computador: o mouse aponta, A/D e as setas giram, W/S mudam a força.

Como funciona por dentro: `games/ultimodepe/game.js` é o motor de rodadas (fases com
`api.armTimer`, miras via `t:'input'`, eliminação, desempate, vencedor). `games/ultimodepe/rules.js`
tem as duas variantes, puras e determinísticas (`spawn`, `prepare`, `resolve`). O servidor resolve
cada rodada uma vez e manda um replay; TV e celulares só desenham (`shared/ultimodepe/render.js`,
Canvas 2D, roda na TV antiga). Nas fases escondidas a view não leva a posição de ninguém, nem para
a TV. Uma mira que chega até 260 ms depois do fim do 3‑2‑1 ainda vale (folga para o ping).
Testes: `node --test test/ultimodepe.test.js`.

## Jogos de arena (Crate Crush, Polar Push, Pogo Pandemonium, Ballistix)

Quatro minijogos no estilo de Crash Bash (PlayStation, 2000), com os bonecos da casa no lugar dos personagens.
Até 4 pessoas jogam; a CPU completa as vagas (pode desligar). Quem sobra assiste e entra na próxima.

- **Preparação (celular):** o primeiro jogador escolhe a arena (4 por jogo), quantas vitórias levam o troféu
  (1, 2 ou 3), CPU ligada ou não e o nível da CPU (Fácil, Normal, Difícil). Qualquer um toca **Entrar** ou **Só assistir**.
- **Partida:** a TV mostra a arena em 3/4, placar nos cantos e o 3-2-1. Cada rodada termina com um vencedor
  (ou empate); quem chega primeiro ao número de vitórias leva o troféu. No fim: **Revanche** ou **Trocar arena**.
- **Controle:** o celular vira um controle deitado (em pé ele gira sozinho): analógico à esquerda, até 3 botões
  (A verde, B azul, C amarelo) à direita. No computador: WASD/setas, J = A, K = B, L = C. Vibra quando você apanha.
- **Quedas:** quem sai no meio da partida vira CPU. O primeiro jogador pode parar a partida (■ duas vezes).

| Jogo | Controles | Como vence |
|---|---|---|
| Crate Crush | A pega/joga caixa, B pula, C chuta (ou usa a arma) | último de pé; no fim dos 90 s, mais vida |
| Polar Push | A investida (medidor), B bomba/bola de neve | último no gelo |
| Pogo Pandemonium | analógico pula de casa em casa, A míssil | mais pontos guardados em 90 s |
| Ballistix | analógico anda no seu gol, A chute, B turbo, C ímã (Beach Ball) | último com pontos |

Por dentro: `shared/bash/engine.js` é o motor comum (vagas, CPU, rodadas, troféu, entradas `t:'input'`, 60 passos
por segundo, 30 quadros por segundo para a TV). Cada jogo tem só `games/<id>/sim.js` (regras, física e CPU, puras),
`tv.js` (desenho, ES5 para a TV antiga) e `phone.js` (uma linha). A TV usa `shared/bash/tv.js` (canvas 2D, câmera 3/4,
interpolação, partículas, sons sintetizados, placar, cartazes) e o celular `shared/bash/phone.js`. O contrato da
simulação está no topo de `engine.js`. Testes: `node --test test/bash-engine.test.js test/cratecrush.test.js
test/polarpush.test.js test/pogo.test.js test/ballistix.test.js`.
