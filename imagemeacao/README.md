# Imagem e Ação — multiplayer local

TV mostra o tabuleiro. Cada jogador entra pelo celular e escolhe uma cor (equipe).

## Rodar

```bash
cd imagemeacao
npm install
npm start
```

O terminal mostra os links. Exemplo:

- TV: `http://192.168.10.102:3000/tv`
- Celulares: `http://192.168.10.102:3000/`

Todos precisam estar no mesmo Wi-Fi. A TV mostra um QR code para entrar.

Atalho: `http://IP:3000/?cor=roxo&nome=Ana` entra direto na equipe.

## Regras (como no tabuleiro)

1. Cada equipe escolhe uma cor. Precisa de 2 equipes ou mais.
   Dentro da equipe, quem desenha segue a ordem de entrada. Não dá para escolher. Quem desenhou agora não desenha na próxima vez da equipe (casa "Todos jogam" conta como vez). Só o celular do desenhista vê a palavra e joga o dado. Se o celular dele cair, o jogo espera ele voltar: ninguém joga no lugar. Para mudar o nome, toque no seu nome no topo.
2. Na sua vez: joga o dado no celular. A TV mostra a casa alvo (peão fantasma). O peão ainda não anda.
3. A cor da casa alvo é a categoria. A palavra aparece só no celular de quem desenha.
4. Aperte "Começar a desenhar". O tempo (60 s) aparece na TV.
5. Acertou: o peão anda até a casa alvo. Errou: o peão fica onde está. Nos dois casos a vez passa para a próxima equipe. Uma equipe nunca joga duas vezes seguidas.
6. Casa "Todos jogam": todas as equipes veem a palavra e desenham. Quem acertar primeiro aperta "Acertamos!" e anda o valor do dado. A vez segue a ordem normal.
7. Ganha quem acerta o desenho da casa FIM.

Tabuleiro: 52 casas em espiral. Categorias: P = Pessoa/Lugar/Animal, O = Objeto, A = Ação, D = Difícil, L = Livre.
Palavras ficam em `cards.js` (pode editar).
