// Cartas do Top 10. Cada carta é um ranking de dez itens, na ordem (1º primeiro).
// Ninguém vê a lista antes do DUVIDO: ela só sai do servidor na hora da revelação.
//
// Para acrescentar cartas, é só continuar as listas abaixo:
//   { t: 'título que aparece na tela', s: 'fonte ou ano (opcional)', items: [dez itens, do 1º ao 10º] }
// A turma sempre vota no fim, então uma lista discutível não quebra o jogo — mas quanto mais
// certinha a fonte, menos briga.

const CATEGORIES = [
  { id: 'mundo', name: 'Mundo', emoji: '🌍' },
  { id: 'brasil', name: 'Brasil', emoji: '🇧🇷' },
  { id: 'cinema', name: 'Cinema e TV', emoji: '🎬' },
  { id: 'musica', name: 'Música', emoji: '🎵' },
  { id: 'esporte', name: 'Esporte', emoji: '⚽' },
  { id: 'natureza', name: 'Natureza', emoji: '🦁' },
  { id: 'ciencia', name: 'Ciência e Espaço', emoji: '🔬' },
  { id: 'comida', name: 'Comida', emoji: '🍕' },
  { id: 'games', name: 'Games e Internet', emoji: '🎮' },
  { id: 'recordes', name: 'Recordes', emoji: '🏆' },
];

const CARDS = {
  mundo: [
    { t: 'Os 10 países mais populosos do mundo', s: 'ONU, 2023',
      items: ['Índia', 'China', 'Estados Unidos', 'Indonésia', 'Paquistão', 'Nigéria', 'Brasil', 'Bangladesh', 'Rússia', 'México'] },
    { t: 'Os 10 maiores países em área', s: 'território total',
      items: ['Rússia', 'Canadá', 'China', 'Estados Unidos', 'Brasil', 'Austrália', 'Índia', 'Argentina', 'Cazaquistão', 'Argélia'] },
    { t: 'Os 10 países mais visitados por turistas', s: 'OMT, 2019',
      items: ['França', 'Espanha', 'Estados Unidos', 'China', 'Itália', 'Turquia', 'México', 'Tailândia', 'Alemanha', 'Reino Unido'] },
    { t: 'As 10 maiores ilhas do mundo', s: 'área',
      items: ['Groenlândia', 'Nova Guiné', 'Bornéu', 'Madagascar', 'Ilha de Baffin', 'Sumatra', 'Honshu', 'Ilha Vitória', 'Grã-Bretanha', 'Ilha de Ellesmere'] },
    { t: 'Os 10 rios mais longos do mundo', s: 'extensão',
      items: ['Nilo', 'Amazonas', 'Yangtzé', 'Mississippi', 'Ienissei', 'Rio Amarelo', 'Ob', 'Paraná', 'Congo', 'Amur'] },
    { t: 'Os 10 idiomas mais falados do mundo', s: 'total de falantes',
      items: ['Inglês', 'Mandarim', 'Hindi', 'Espanhol', 'Árabe', 'Francês', 'Bengali', 'Português', 'Russo', 'Urdu'] },
    { t: 'As 10 maiores cidades do mundo', s: 'região metropolitana, ONU 2018',
      items: ['Tóquio', 'Délhi', 'Xangai', 'São Paulo', 'Cidade do México', 'Cairo', 'Mumbai', 'Pequim', 'Daca', 'Osaka'] },
    { t: 'Os 10 maiores desertos do mundo', s: 'área',
      items: ['Deserto Antártico', 'Deserto Ártico', 'Saara', 'Deserto da Arábia', 'Deserto de Gobi', 'Kalahari', 'Deserto da Patagônia', 'Deserto da Síria', 'Grande Bacia', 'Deserto de Chihuahua'] },
    { t: 'Os 10 países com mais fronteiras terrestres', s: 'número de vizinhos',
      items: ['China', 'Rússia', 'Brasil', 'República Democrática do Congo', 'Alemanha', 'Áustria', 'França', 'Tanzânia', 'Turquia', 'Zâmbia'] },
  ],

  brasil: [
    { t: 'Os 10 estados mais populosos do Brasil', s: 'IBGE, Censo 2022',
      items: ['São Paulo', 'Minas Gerais', 'Rio de Janeiro', 'Bahia', 'Paraná', 'Rio Grande do Sul', 'Pernambuco', 'Ceará', 'Pará', 'Santa Catarina'] },
    { t: 'As 10 cidades mais populosas do Brasil', s: 'IBGE, Censo 2022',
      items: ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Fortaleza', 'Salvador', 'Belo Horizonte', 'Manaus', 'Curitiba', 'Recife', 'Goiânia'] },
    { t: 'Os 10 maiores estados do Brasil em área', s: 'IBGE',
      items: ['Amazonas', 'Pará', 'Mato Grosso', 'Minas Gerais', 'Bahia', 'Mato Grosso do Sul', 'Goiás', 'Maranhão', 'Rio Grande do Sul', 'Tocantins'] },
    { t: 'Os 10 estados com o maior PIB do Brasil', s: 'IBGE, 2021',
      items: ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Rio Grande do Sul', 'Paraná', 'Santa Catarina', 'Bahia', 'Distrito Federal', 'Goiás', 'Pernambuco'] },
    { t: 'Os 10 nomes mais comuns do Brasil', s: 'IBGE, Censo 2010',
      items: ['Maria', 'José', 'Ana', 'João', 'Antônio', 'Francisco', 'Carlos', 'Paulo', 'Pedro', 'Lucas'] },
    { t: 'Os 10 estados com mais municípios', s: 'IBGE',
      items: ['Minas Gerais', 'São Paulo', 'Rio Grande do Sul', 'Bahia', 'Paraná', 'Santa Catarina', 'Goiás', 'Piauí', 'Paraíba', 'Maranhão'] },
    { t: 'Os 10 primeiros presidentes da República do Brasil', s: 'em ordem',
      items: ['Deodoro da Fonseca', 'Floriano Peixoto', 'Prudente de Morais', 'Campos Sales', 'Rodrigues Alves', 'Afonso Pena', 'Nilo Peçanha', 'Hermes da Fonseca', 'Venceslau Brás', 'Delfim Moreira'] },
  ],

  cinema: [
    { t: 'As 10 maiores bilheterias do cinema', s: 'mundial, até 2024',
      items: ['Avatar', 'Vingadores: Ultimato', 'Avatar: O Caminho da Água', 'Titanic', 'Star Wars: O Despertar da Força', 'Vingadores: Guerra Infinita', 'Homem-Aranha: Sem Volta Para Casa', 'Divertida Mente 2', 'Jurassic World: O Mundo dos Dinossauros', 'O Rei Leão (2019)'] },
    { t: 'Os 10 filmes com mais Oscars', s: 'estatuetas ganhas',
      items: ['Ben-Hur', 'Titanic', 'O Senhor dos Anéis: O Retorno do Rei', 'Amor, Sublime Amor', 'Gigi', 'O Último Imperador', 'O Paciente Inglês', 'E o Vento Levou', 'Gandhi', 'Amadeus'] },
    { t: 'As 10 maiores bilheterias da animação', s: 'mundial, até 2024',
      items: ['Divertida Mente 2', 'O Rei Leão (2019)', 'Frozen 2', 'Super Mario Bros. O Filme', 'Frozen', 'Os Incríveis 2', 'Minions', 'Toy Story 4', 'Toy Story 3', 'Zootopia'] },
    { t: 'Os 10 primeiros filmes do Universo Marvel', s: 'ordem de lançamento',
      items: ['Homem de Ferro', 'O Incrível Hulk', 'Homem de Ferro 2', 'Thor', 'Capitão América: O Primeiro Vingador', 'Os Vingadores', 'Homem de Ferro 3', 'Thor: O Mundo Sombrio', 'Capitão América 2: O Soldado Invernal', 'Guardiões da Galáxia'] },
    { t: 'Os 10 filmes mais bem avaliados do IMDb', s: 'nota dos usuários',
      items: ['Um Sonho de Liberdade', 'O Poderoso Chefão', 'Batman: O Cavaleiro das Trevas', 'O Poderoso Chefão II', '12 Homens e uma Sentença', 'A Lista de Schindler', 'O Senhor dos Anéis: O Retorno do Rei', 'Pulp Fiction', 'O Senhor dos Anéis: A Sociedade do Anel', 'Três Homens em Conflito'] },
  ],

  musica: [
    { t: 'Os 10 artistas que mais venderam discos na história', s: 'estimativa',
      items: ['The Beatles', 'Elvis Presley', 'Michael Jackson', 'Elton John', 'Queen', 'Madonna', 'Led Zeppelin', 'Rihanna', 'Pink Floyd', 'Eminem'] },
    { t: 'Os 10 álbuns mais vendidos da história', s: 'estimativa',
      items: ['Thriller', 'Back in Black', 'The Bodyguard', 'Their Greatest Hits (Eagles)', 'Saturday Night Fever', 'Rumours', 'The Dark Side of the Moon', 'Come On Over', 'Led Zeppelin IV', 'Bat Out of Hell'] },
    { t: 'As 10 músicas mais tocadas do Spotify', s: 'até 2024',
      items: ['Blinding Lights', 'Shape of You', 'Someone You Loved', 'As It Was', 'Sunflower', 'Sweater Weather', 'One Dance', 'Starboy', 'STAY', 'Perfect'] },
  ],

  esporte: [
    { t: 'Os 10 países com mais participações em Copas do Mundo', s: 'até 2022',
      items: ['Brasil', 'Alemanha', 'Itália', 'Argentina', 'México', 'Espanha', 'França', 'Inglaterra', 'Bélgica', 'Uruguai'] },
    { t: 'Os 10 maiores artilheiros da história das Copas', s: 'até 2022',
      items: ['Miroslav Klose', 'Ronaldo', 'Gerd Müller', 'Just Fontaine', 'Lionel Messi', 'Pelé', 'Kylian Mbappé', 'Sándor Kocsis', 'Jürgen Klinsmann', 'Thomas Müller'] },
    { t: 'Os 10 maiores campeões da Champions League', s: 'títulos',
      items: ['Real Madrid', 'Milan', 'Bayern de Munique', 'Liverpool', 'Barcelona', 'Ajax', 'Inter de Milão', 'Manchester United', 'Juventus', 'Benfica'] },
    { t: 'Os 10 maiores campeões da Libertadores', s: 'títulos',
      items: ['Independiente', 'Boca Juniors', 'Peñarol', 'River Plate', 'Estudiantes', 'Olimpia', 'Nacional', 'São Paulo', 'Grêmio', 'Santos'] },
    { t: 'Os 10 maiores estádios do mundo', s: 'capacidade',
      items: ['Rungrado 1º de Maio', 'Michigan Stadium', 'Beaver Stadium', 'Ohio Stadium', 'Kyle Field', 'Tiger Stadium', 'Neyland Stadium', 'Bryant-Denny Stadium', 'Darrell K Royal Stadium', 'Sanford Stadium'] },
  ],

  natureza: [
    { t: 'Os 10 animais terrestres mais rápidos', s: 'velocidade máxima',
      items: ['Guepardo', 'Antílope-americano', 'Springbok', 'Gnu-azul', 'Leão', 'Antílope-negro', 'Lebre', 'Galgo', 'Cavalo', 'Avestruz'] },
    { t: 'Os 10 maiores animais do mundo', s: 'peso',
      items: ['Baleia-azul', 'Baleia-comum', 'Baleia-franca', 'Cachalote', 'Baleia-jubarte', 'Tubarão-baleia', 'Elefante-africano', 'Elefante-asiático', 'Rinoceronte-branco', 'Hipopótamo'] },
    { t: 'As 10 montanhas mais altas do mundo', s: 'altitude',
      items: ['Everest', 'K2', 'Kangchenjunga', 'Lhotse', 'Makalu', 'Cho Oyu', 'Dhaulagiri', 'Manaslu', 'Nanga Parbat', 'Annapurna'] },
    { t: 'Os 10 maiores lagos do mundo', s: 'área',
      items: ['Mar Cáspio', 'Lago Superior', 'Lago Vitória', 'Lago Huron', 'Lago Michigan', 'Lago Tanganica', 'Lago Baikal', 'Grande Lago do Urso', 'Lago Malawi', 'Grande Lago do Escravo'] },
    { t: 'As 10 raças de cachorro mais populares', s: 'AKC, 2023',
      items: ['Bulldog Francês', 'Labrador Retriever', 'Golden Retriever', 'Pastor Alemão', 'Poodle', 'Dachshund', 'Beagle', 'Rottweiler', 'Bulldog Inglês', 'Pointer Alemão'] },
  ],

  ciencia: [
    { t: 'Os 10 maiores corpos do Sistema Solar (fora o Sol)', s: 'diâmetro',
      items: ['Júpiter', 'Saturno', 'Urano', 'Netuno', 'Terra', 'Vênus', 'Marte', 'Ganimedes', 'Titã', 'Mercúrio'] },
    { t: 'Os 10 primeiros elementos da tabela periódica', s: 'número atômico',
      items: ['Hidrogênio', 'Hélio', 'Lítio', 'Berílio', 'Boro', 'Carbono', 'Nitrogênio', 'Oxigênio', 'Flúor', 'Neônio'] },
    { t: 'Os 10 elementos mais abundantes da crosta terrestre', s: 'massa',
      items: ['Oxigênio', 'Silício', 'Alumínio', 'Ferro', 'Cálcio', 'Sódio', 'Potássio', 'Magnésio', 'Titânio', 'Hidrogênio'] },
    { t: 'As 10 primeiras pessoas a pisar na Lua', s: 'em ordem',
      items: ['Neil Armstrong', 'Buzz Aldrin', 'Pete Conrad', 'Alan Bean', 'Alan Shepard', 'Edgar Mitchell', 'David Scott', 'James Irwin', 'John Young', 'Charles Duke'] },
  ],

  comida: [
    { t: 'Os 10 maiores produtores de café do mundo', s: 'sacas por ano',
      items: ['Brasil', 'Vietnã', 'Colômbia', 'Indonésia', 'Etiópia', 'Honduras', 'Índia', 'Uganda', 'México', 'Peru'] },
    { t: 'Os 10 países que mais tomam café', s: 'por pessoa',
      items: ['Finlândia', 'Noruega', 'Islândia', 'Dinamarca', 'Holanda', 'Suécia', 'Suíça', 'Bélgica', 'Luxemburgo', 'Canadá'] },
    { t: 'As 10 frutas mais produzidas do mundo', s: 'FAO',
      items: ['Banana', 'Melancia', 'Maçã', 'Laranja', 'Uva', 'Manga', 'Banana-da-terra', 'Pera', 'Abacaxi', 'Pêssego'] },
    { t: 'Os 10 maiores produtores de vinho do mundo', s: 'litros por ano',
      items: ['Itália', 'França', 'Espanha', 'Estados Unidos', 'Argentina', 'Austrália', 'Chile', 'África do Sul', 'Alemanha', 'Portugal'] },
    { t: 'Os 10 sabores de pizza mais pedidos no Brasil', s: 'pesquisas de mercado',
      items: ['Calabresa', 'Mussarela', 'Portuguesa', 'Frango com catupiry', 'Quatro queijos', 'Marguerita', 'Bacon', 'Chocolate', 'Napolitana', 'Toscana'] },
  ],

  games: [
    { t: 'Os 10 jogos mais vendidos da história', s: 'aproximado',
      items: ['Minecraft', 'GTA V', 'Tetris (EA)', 'Wii Sports', 'PUBG: Battlegrounds', 'Mario Kart 8', 'Red Dead Redemption 2', 'Terraria', 'Super Mario Bros.', 'Animal Crossing: New Horizons'] },
    { t: 'Os 10 consoles mais vendidos da história', s: 'unidades',
      items: ['PlayStation 2', 'Nintendo DS', 'Nintendo Switch', 'Game Boy', 'PlayStation 4', 'PlayStation', 'Wii', 'PlayStation 3', 'Xbox 360', 'Game Boy Advance'] },
    { t: 'Os 10 canais com mais inscritos do YouTube', s: '2024',
      items: ['MrBeast', 'T-Series', 'Cocomelon', 'SET India', 'Kids Diana Show', 'Vlad and Niki', 'Zee Music Company', 'Like Nastya', 'PewDiePie', 'WWE'] },
    { t: 'Os 10 sites mais acessados do mundo', s: 'Similarweb, 2024',
      items: ['Google', 'YouTube', 'Facebook', 'Instagram', 'X (Twitter)', 'Baidu', 'Wikipedia', 'Yahoo', 'WhatsApp', 'Amazon'] },
  ],

  recordes: [
    { t: 'Os 10 prédios mais altos do mundo', s: 'altura, 2024',
      items: ['Burj Khalifa', 'Merdeka 118', 'Torre de Xangai', 'Abraj Al-Bait', 'Ping An Finance Center', 'Lotte World Tower', 'One World Trade Center', 'Guangzhou CTF', 'Tianjin CTF', 'CITIC Tower'] },
    { t: 'Os 10 países com mais prêmios Nobel', s: 'total de laureados',
      items: ['Estados Unidos', 'Reino Unido', 'Alemanha', 'França', 'Suécia', 'Rússia', 'Japão', 'Canadá', 'Suíça', 'Áustria'] },
    { t: 'As 10 marcas mais valiosas do mundo', s: 'Interbrand, 2023',
      items: ['Apple', 'Microsoft', 'Amazon', 'Google', 'Samsung', 'Toyota', 'Mercedes-Benz', 'Coca-Cola', 'Nike', 'BMW'] },
    { t: 'As 10 pessoas mais ricas do mundo', s: 'Forbes, 2024',
      items: ['Elon Musk', 'Jeff Bezos', 'Bernard Arnault', 'Mark Zuckerberg', 'Larry Ellison', 'Warren Buffett', 'Larry Page', 'Sergey Brin', 'Bill Gates', 'Steve Ballmer'] },
    { t: 'Os 10 aeroportos mais movimentados do mundo', s: 'passageiros, 2023',
      items: ['Atlanta', 'Dubai', 'Dallas-Fort Worth', 'Londres-Heathrow', 'Tóquio-Haneda', 'Denver', 'Istambul', 'Chicago O\'Hare', 'Nova Délhi', 'Los Angeles'] },
  ],
};

module.exports = { CATEGORIES, CARDS };
