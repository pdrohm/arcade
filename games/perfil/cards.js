// Cartas do Perfil. Cada carta: resposta + 20 dicas (da mais difícil para a mais fácil, como no jogo).
// Pode editar à vontade. Categorias: P = Pessoa, L = Lugar, C = Coisa, A = Ano.
const CATEGORIES = {
  P: { name: 'Pessoa', color: '#f97316', text: '#111' },
  L: { name: 'Lugar',  color: '#22c55e', text: '#111' },
  C: { name: 'Coisa',  color: '#3b82f6', text: '#fff' },
  A: { name: 'Ano',    color: '#a855f7', text: '#fff' },
  S: { name: 'Série ou Filme', color: '#ec4899', text: '#fff' },
};

const CARDS = {
  P: [
    { answer: 'Pelé', clues: [
      'Nasci em Três Corações, Minas Gerais.', 'Meu nome de batismo é Edson Arantes do Nascimento.', 'Meu pai também foi jogador de futebol, conhecido como Dondinho.', 'Meu apelido veio de uma confusão com o nome de um goleiro chamado Bilé.',
      'Fui vendedor de amendoim quando criança.', 'Joguei no Bauru quando era adolescente.', 'Fiz meu primeiro gol profissional aos 15 anos.', 'Fui Ministro do Esporte no governo Fernando Henrique.',
      'Um decreto de 1961 me declarou "patrimônio nacional".', 'Fiz meu milésimo gol no Maracanã, em 1969, de pênalti.', 'Joguei no New York Cosmos no fim da carreira.', 'Fui eleito o Atleta do Século pelo COI.',
      'Marquei gols em quatro Copas do Mundo.', 'Ganhei a Copa de 1958 com apenas 17 anos.', 'Fui campeão do mundo com o Brasil em 1958, 1962 e 1970.', 'Usei a camisa 10 no Santos por quase 20 anos.',
      'Sou o único jogador tricampeão mundial.', 'Sou chamado de "O Rei do Futebol".', 'Morri em dezembro de 2022, em São Paulo.', 'Sou o maior jogador de futebol brasileiro de todos os tempos.',
    ] },
    { answer: 'Ayrton Senna', clues: [
      'Nasci em São Paulo, em 1960.', 'Ganhei meu primeiro kart aos 4 anos.', 'Meu sobrenome verdadeiro é da Silva; usei o sobrenome da minha mãe.', 'Fui campeão da Fórmula Ford e da Fórmula 3 inglesa.',
      'Estreei na Fórmula 1 pela equipe Toleman, em 1984.', 'Corri pela Lotus antes de ir para a McLaren.', 'Ganhei minha primeira corrida em Portugal, debaixo de chuva.', 'Tive uma rivalidade famosa com Alain Prost.',
      'Sou conhecido pelas voltas de classificação e pelas corridas na chuva.', 'Ganhei três títulos mundiais: 1988, 1990 e 1991.', 'Venci seis vezes o Grande Prêmio de Mônaco.', 'Fui campeão pela McLaren-Honda.',
      'Venci em Interlagos em 1991 com o câmbio quebrado, só na sexta marcha.', 'Fundei um instituto que ajuda crianças e leva meu nome.', 'Meu capacete era amarelo com faixas verde e azul.', 'Morri no circuito de Ímola, na Itália, em 1º de maio de 1994.',
      'Minha última equipe foi a Williams.', 'Sou considerado um dos maiores pilotos da história.', 'O tema da vitória na TV brasileira era tocado quando eu vencia.', 'Sou o piloto brasileiro mais famoso da Fórmula 1.',
    ] },
    { answer: 'Albert Einstein', clues: [
      'Nasci na Alemanha, em 1879.', 'Demorei para falar quando criança.', 'Trabalhei num escritório de patentes na Suíça.', 'Em 1905 publiquei quatro artigos que mudaram a física.',
      'Expliquei o efeito fotoelétrico.', 'Fui professor em Berlim.', 'Deixei a Alemanha quando os nazistas subiram ao poder.', 'Trabalhei na Universidade de Princeton, nos Estados Unidos.',
      'Escrevi uma carta ao presidente Roosevelt sobre a bomba atômica.', 'Toquei violino a vida inteira.', 'Recusei ser presidente de Israel.', 'Ganhei o Nobel de Física em 1921.',
      'Criei a Teoria da Relatividade.', 'Minha equação mais famosa é E = mc².', 'Meu cabelo branco e bagunçado virou símbolo de gênio.', 'Existe uma foto famosa minha mostrando a língua.',
      'Meu nome virou sinônimo de pessoa muito inteligente.', 'Sou o físico mais famoso do século 20.', 'Nasci alemão, virei suíço e depois americano.', 'Meu sobrenome termina com "stein".',
    ] },
    { answer: 'Michael Jackson', clues: [
      'Nasci em Gary, Indiana, em 1958.', 'Sou o oitavo de dez filhos.', 'Comecei a carreira num grupo com meus irmãos.', 'Meu primeiro grupo era formado por cinco irmãos.',
      'Gravei pela Motown quando criança.', 'Quincy Jones produziu meus maiores discos.', 'Meu rancho se chamava Neverland.', 'Tive um chimpanzé chamado Bubbles.',
      'Usava uma luva branca só numa mão.', 'Meu clipe de terror de 14 minutos virou clássico.', 'Meus discos incluem "Off the Wall", "Bad" e "Dangerous".', 'Meu passo de dança mais famoso é o "moonwalk".',
      'Fui casado com a filha de Elvis Presley.', 'Cantei "Billie Jean" e "Beat It".', 'Meu álbum "Thriller" é o mais vendido da história.', 'Morri em 2009, em Los Angeles.',
      'Sou chamado de "Rei do Pop".', 'Sou um cantor e dançarino americano.', 'Minhas irmãs Janet e La Toya também são cantoras.', 'Meu primeiro nome começa com M e o sobrenome com J.',
    ] },
    { answer: 'Leonardo da Vinci', clues: [
      'Nasci em 1452, numa vila da Toscana.', 'Era filho ilegítimo de um tabelião.', 'Fui aprendiz no ateliê de Verrocchio, em Florença.', 'Escrevia da direita para a esquerda, em espelho.',
      'Era canhoto e vegetariano.', 'Trabalhei para Ludovico Sforza, em Milão.', 'Dissequei cadáveres para estudar anatomia.', 'Desenhei máquinas voadoras e tanques de guerra séculos antes de existirem.',
      'Passei meus últimos anos na França, a convite do rei Francisco I.', 'Deixei milhares de páginas de cadernos com anotações.', 'Fui pintor, inventor, engenheiro e cientista.', 'Pintei "A Última Ceia" numa parede de Milão.',
      'Meu desenho "Homem Vitruviano" mostra as proporções do corpo.', 'Sou o maior nome do Renascimento italiano.', 'Um dos meus quadros está no Louvre atrás de um vidro blindado.', 'Pintei a "Mona Lisa".',
      'Meu sobrenome vem da cidade da Toscana onde nasci.', 'Uma das Tartarugas Ninja tem meu nome.', 'Meu primeiro nome tem 8 letras e começa com L.', 'Sou o gênio italiano que pintou a mulher do sorriso misterioso.',
    ] },
    { answer: 'Frida Kahlo', clues: [
      'Nasci em Coyoacán, no México, em 1907.', 'Tive poliomielite quando criança.', 'Um acidente de bonde aos 18 anos me deixou com dores para o resto da vida.', 'Comecei a pintar deitada na cama, com um espelho no teto.',
      'Minha casa era pintada de azul.', 'Fui casada com o muralista Diego Rivera, duas vezes.', 'Usava vestidos tradicionais tehuanas e flores no cabelo.', 'Tive um caso com Leon Trótski.',
      'Pintei animais de estimação: macacos, papagaios e cães.', 'Minhas sobrancelhas unidas viraram minha marca.', 'Fiz muitos autorretratos.', 'Pintei "A Coluna Partida" e um quadro com duas versões de mim, de mãos dadas.',
      'Minha arte fala de dor, corpo e identidade mexicana.', 'Salma Hayek me interpretou num filme de 2002.', 'Morri em 1954, na mesma casa em que nasci.', 'Minha casa virou um museu.',
      'Sou a pintora mexicana mais famosa do mundo.', 'Meu rosto está em camisetas, bolsas e murais.', 'Sou um ícone feminista.', 'Meu nome começa com F e meu sobrenome com K.',
    ] },
    { answer: 'Santos Dumont', clues: [
      'Nasci em Minas Gerais, em 1873, numa fazenda de café.', 'Meu pai era engenheiro e ficou rico com o café.', 'Fui morar em Paris ainda jovem.', 'Comecei voando em balões.',
      'Criei dirigíveis e dei a volta na Torre Eiffel com um deles, em 1901.', 'Ganhei o Prêmio Deutsch por esse voo.', 'Era baixinho e usava chapéu panamá.', 'Meu amigo Cartier criou um relógio de pulso para mim.',
      'Minha casa em Petrópolis se chama "A Encantada" e não tem cozinha.', 'Nunca patenteei meus inventos.', 'Fiquei deprimido ao ver aviões usados na guerra.', 'Morri no Guarujá, em 1932.',
      'Meu avião mais famoso é o 14-Bis.', 'Voei o 14-Bis em Paris, em 1906, diante de uma multidão.', 'Também criei o Demoiselle, um avião pequeno e leve.', 'O aeroporto do Rio de Janeiro tem meu nome.',
      'O Brasil me considera o "Pai da Aviação".', 'Sou brasileiro e disputo com os irmãos Wright o título de inventor do avião.', 'Meu sobrenome está numa cidade de Minas Gerais.', 'Meu nome é Alberto.',
    ] },
    { answer: 'Xuxa', clues: [
      'Nasci em Santa Rosa, no Rio Grande do Sul, em 1963.', 'Meu nome de batismo é Maria da Graça.', 'Comecei como modelo, aos 16 anos.', 'Namorei Pelé por seis anos.',
      'Namorei também o piloto Ayrton Senna.', 'Meu primeiro programa infantil foi na TV Manchete.', 'Meu apelido foi dado pelos meus irmãos.', 'Meu programa tinha uma nave espacial.',
      'Minhas assistentes de palco eram as Paquitas.', 'Beijava as crianças e mandava beijos para a câmera.', 'Meus discos vendiam milhões nos anos 80 e 90.', 'Fiz programas na Argentina e nos Estados Unidos.',
      'Minha filha se chama Sasha.', 'Meu programa mais famoso começava com "Xou da…".', 'Tenho uma fundação que ajuda crianças.', 'Sou loira e chamada de "Rainha dos Baixinhos".',
      'Comandei um programa com "Park" no nome.', 'Sou a apresentadora infantil mais famosa do Brasil.', 'Fui apresentadora da Globo por mais de 20 anos.', 'Meu nome artístico tem só quatro letras.',
    ] },
    { answer: 'Harry Potter', clues: [
      'Nasci em 31 de julho.', 'Meus pais foram assassinados quando eu tinha um ano.', 'Cresci com meus tios e dormia num armário debaixo da escada.', 'Descobri aos 11 anos que era bruxo.',
      'Meu melhor amigo é ruivo e vem de uma família grande.', 'Minha outra melhor amiga é a aluna mais inteligente da escola.', 'Minha coruja se chamava Edwiges.', 'Jogo quadribol como apanhador.',
      'Estudei numa escola chamada Hogwarts.', 'Fui escolhido para a casa Grifinória.', 'Sou "o menino que sobreviveu".', 'Minha varinha tem pena de fênix.',
      'Meu maior inimigo é Lord Voldemort.', 'Tenho uma cicatriz em forma de raio na testa.', 'Uso óculos redondos.', 'Fui criado pela escritora J.K. Rowling.',
      'Sou personagem de sete livros e oito filmes.', 'Daniel Radcliffe me interpretou no cinema.', 'Sou o bruxo mais famoso da literatura.', 'Meu primeiro nome tem 5 letras e começa com H.',
    ] },
    { answer: 'Neymar', clues: [
      'Nasci em Mogi das Cruzes, São Paulo, em 1992.', 'Meu pai também foi jogador e é meu empresário.', 'Comecei jogando futsal.', 'Estreei no Santos aos 17 anos.',
      'Ganhei a Libertadores de 2011 com o Santos.', 'Fui campeão olímpico em 2016, no Rio.', 'Fui para o Barcelona em 2013.', 'Formei o trio "MSN" com Messi e Suárez.',
      'Minha transferência para o PSG foi a mais cara da história.', 'Joguei no Al-Hilal, na Arábia Saudita.', 'Sou conhecido pelos dribles e pelos cortes de cabelo.', 'Sou o maior artilheiro da Seleção Brasileira.',
      'Meu filho se chama Davi Lucca.', 'Uso a camisa 10 na Seleção.', 'Voltei para o Santos em 2025.', 'Meu apelido é "Ney".',
      'Sou um atacante brasileiro.', 'Meu nome completo termina com "Júnior".', 'Sou um dos jogadores mais famosos do mundo.', 'Meu nome tem 6 letras e começa com N.',
    ] },
  ],
  L: [
    { answer: 'Paris', clues: [
      'Fui fundada por uma tribo celta.', 'Os romanos me chamavam de Lutécia.', 'Sou cortada por um rio chamado Sena.', 'Tenho duas ilhas no meio do rio.',
      'Minha catedral gótica pegou fogo em 2019.', 'Tenho um metrô com mais de 100 anos.', 'Meus bairros se chamam arrondissements.', 'Sediei os Jogos Olímpicos de 1900, 1924 e 2024.',
      'Sou chamada de "Cidade Luz".', 'Meu museu mais famoso fica num antigo palácio real.', 'A "Mona Lisa" mora aqui.', 'Tenho um arco do triunfo no fim de uma avenida famosa.',
      'Minha avenida mais famosa é a Champs-Élysées.', 'Sou a cidade da moda e dos croissants.', 'Uma torre de ferro de 300 metros é meu símbolo.', 'A Torre Eiffel fica aqui.',
      'Sou a capital da França.', 'Fico na Europa.', 'Sou considerada a cidade mais romântica do mundo.', 'Meu nome começa com P.',
    ] },
    { answer: 'Rio de Janeiro', clues: [
      'Fui fundada em 1565 por Estácio de Sá.', 'Fui capital do Brasil por quase 200 anos.', 'A família real portuguesa morou aqui.', 'Tenho a maior floresta urbana do mundo, a Tijuca.',
      'Meu estádio mais famoso recebeu duas finais de Copa do Mundo.', 'Sediei os Jogos Olímpicos de 2016.', 'Tenho uma praia chamada Copacabana.', 'Minha baía se chama Guanabara.',
      'Meus moradores são chamados de cariocas.', 'Meu carnaval é o mais famoso do mundo.', 'Tenho um bondinho que sobe um morro em forma de pão.', 'O Pão de Açúcar fica aqui.',
      'Tenho um teleférico e um trenzinho que sobe o Corcovado.', 'Sou chamada de "Cidade Maravilhosa".', 'Uma estátua de 38 metros abençoa a cidade de braços abertos.', 'O Cristo Redentor fica aqui.',
      'Sou uma cidade do sudeste do Brasil.', 'Meu nome vem de um erro: acharam que a baía era um rio.', 'Sou a segunda maior cidade do Brasil.', 'Meu nome começa com Rio.',
    ] },
    { answer: 'Egito', clues: [
      'Meu nome antigo era Kemet, "a terra negra".', 'Fui governado por reis chamados faraós.', 'Cleópatra foi minha última rainha.', 'Minha escrita antiga usava desenhos, os hieróglifos.',
      'A Pedra de Roseta foi encontrada aqui.', 'Um canal cortado no meu território liga dois mares.', 'O Canal de Suez fica aqui.', 'Minha capital é o Cairo.',
      'Fico no nordeste da África.', 'Tenho um templo enorme chamado Karnak, em Luxor.', 'Tutancâmon foi um dos meus faraós.', 'Meu maior rio é o Nilo.',
      'Faço fronteira com a Líbia e o Sudão.', 'Tenho uma estátua de leão com cabeça humana, a Esfinge.', 'Múmias e sarcófagos vieram de mim.', 'Sou o país das pirâmides.',
      'As Pirâmides de Gizé ficam aqui.', 'Uma das sete maravilhas do mundo antigo ainda existe aqui.', 'Sou um país árabe e africano.', 'Meu nome começa com E.',
    ] },
    { answer: 'Nova York', clues: [
      'Fui fundada pelos holandeses com outro nome, que homenageava a capital deles.', 'Tenho cinco distritos, chamados boroughs.', 'Meu maior parque tem 3,4 km² no meio da cidade.', 'Fui capital dos Estados Unidos por pouco tempo.',
      'Wall Street fica aqui.', 'Meus táxis são amarelos.', 'Sou chamada de "Big Apple", a Grande Maçã.', 'A sede da ONU fica aqui.',
      'Duas torres gêmeas caíram aqui em 2001.', 'Tenho um bairro chamado Brooklyn e outro chamado Bronx.', 'Meu metrô funciona 24 horas por dia.', 'Uma praça cheia de telões e luzes é meu ponto turístico mais visitado.',
      'A Times Square fica aqui.', 'O Empire State Building fica aqui.', 'Sou a cidade que nunca dorme.', 'Meu bairro mais famoso é uma ilha: Manhattan.',
      'Uma estátua verde segurando uma tocha me dá as boas-vindas.', 'A Estátua da Liberdade fica aqui.', 'Sou a maior cidade dos Estados Unidos.', 'Meu nome tem duas palavras: a primeira começa com N e a segunda com Y.',
    ] },
    { answer: 'Amazônia', clues: [
      'Meu nome vem de guerreiras da mitologia grega.', 'Um explorador espanhol me batizou assim no século 16.', 'Ocupo nove países.', 'Produzo boa parte da chuva do sul do Brasil, pelos "rios voadores".',
      'Tenho o maior rio do mundo em volume de água.', 'Meu rio principal nasce no Peru.', 'Tenho o boto cor-de-rosa e a vitória-régia.', 'Tenho o encontro das águas, perto de Manaus.',
      'Muitos povos indígenas vivem em mim.', 'Chico Mendes lutou para me proteger.', 'Sou chamada de "pulmão do mundo".', 'Belém e Manaus são minhas maiores cidades.',
      'Sou a maior floresta tropical do planeta.', 'Tenho a maior biodiversidade do mundo.', 'Sofro com queimadas e desmatamento.', 'A maior parte de mim fica no Brasil.',
      'Sou uma floresta.', 'Meu rio tem o mesmo nome que eu.', 'Sou a maior floresta do mundo.', 'Meu nome começa com A.',
    ] },
    { answer: 'Japão', clues: [
      'Sou formado por mais de 6 mil ilhas.', 'Minha bandeira é um círculo vermelho no fundo branco.', 'Meu imperador é da dinastia mais antiga do mundo.', 'Tenho trens-bala chamados shinkansen.',
      'Meu esporte tradicional é o sumô.', 'Sou a terra dos samurais e dos ninjas.', 'Sofri dois ataques com bombas atômicas em 1945.', 'Minha montanha mais famosa é um vulcão: o Monte Fuji.',
      'Sou a terra do karaokê, do mangá e do animê.', 'Minha moeda é o iene.', 'Tenho a maior comunidade de descendentes fora do país no Brasil.', 'Meu prato mais famoso no mundo é o sushi.',
      'Minha capital é Tóquio.', 'Sou chamado de "Terra do Sol Nascente".', 'Sou o país das cerejeiras, as sakuras.', 'Toyota, Sony e Nintendo nasceram aqui.',
      'Fico no leste da Ásia.', 'Meu nome em japonês é Nihon ou Nippon.', 'Sou um país asiático de ilhas.', 'Meu nome começa com J.',
    ] },
    { answer: 'Salvador', clues: [
      'Fui fundada em 1549 por Tomé de Souza.', 'Fui a primeira capital do Brasil.', 'Sou dividida em Cidade Alta e Cidade Baixa.', 'Um elevador público liga minhas duas partes.',
      'O Elevador Lacerda fica aqui.', 'Tenho um mercado famoso chamado Mercado Modelo.', 'Meu farol fica na Barra.', 'Minha baía se chama Baía de Todos os Santos.',
      'Tenho uma igreja com fitinhas coloridas amarradas na grade.', 'A Igreja do Bonfim fica aqui.', 'Sou a cidade do acarajé e do vatapá.', 'Sou a capital da capoeira e do axé.',
      'Meu carnaval tem trios elétricos.', 'Meu bairro histórico tem casarões coloridos e ladeiras.', 'O Pelourinho fica aqui.', 'Meu time mais famoso é o Bahia.',
      'Sou a capital da Bahia.', 'Fico no Nordeste do Brasil.', 'Sou a cidade mais negra fora da África.', 'Meu nome completo tem "da Bahia".',
    ] },
    { answer: 'Lua', clues: [
      'Tenho cerca de 4,5 bilhões de anos.', 'Nasci provavelmente de uma colisão gigante com a Terra.', 'Estou me afastando da Terra uns 4 cm por ano.', 'Não tenho atmosfera.',
      'Minha gravidade é um sexto da terrestre.', 'Causo as marés dos oceanos.', 'Meu lado oculto nunca é visto da Terra.', 'Tenho "mares" que não têm água.',
      'Uma sonda soviética me fotografou primeiro.', 'Estou a cerca de 384 mil km da Terra.', 'Doze pessoas já pisaram em mim.', 'Neil Armstrong foi o primeiro a andar em mim, em 1969.',
      'Tenho fases: nova, crescente, cheia e minguante.', 'Reflito a luz do Sol.', 'Um eclipse acontece quando passo na frente do Sol.', 'Lobisomens se transformam quando estou cheia.',
      'Sou o único satélite natural da Terra.', 'Brilho no céu à noite.', 'Meu nome é usado em muitas músicas de amor.', 'Meu nome tem 3 letras e começa com L.',
    ] },
    { answer: 'Machu Picchu', clues: [
      'Fui construída no século 15.', 'Fui abandonada cerca de 100 anos depois.', 'Os espanhóis nunca me encontraram.', 'Fui "redescoberta" em 1911 por Hiram Bingham.',
      'Meu nome significa "montanha velha" em quéchua.', 'Fico a 2.430 metros de altitude.', 'Fui construída pelo imperador Pachacuti.', 'Minhas pedras se encaixam sem argamassa.',
      'Tenho terraços agrícolas nas encostas.', 'Chega-se a mim por trem ou pela Trilha Inca.', 'Fico perto da cidade de Cusco.', 'Lhamas passeiam entre minhas ruínas.',
      'Sou uma das sete maravilhas do mundo moderno.', 'Fico nos Andes.', 'Fui construída pelos incas.', 'Sou uma cidade de pedra no alto da montanha.',
      'Fico no Peru.', 'Sou a ruína mais famosa da América do Sul.', 'Sou um sítio arqueológico.', 'Meu nome tem duas palavras que começam com M e P.',
    ] },
    { answer: 'Disney World', clues: [
      'Fui inaugurado em 1971.', 'Meu criador morreu antes de me ver pronto.', 'Ocupo uma área do tamanho de São Francisco.', 'Tenho túneis subterrâneos para os funcionários.',
      'Tenho quatro parques temáticos e dois parques aquáticos.', 'Tenho um parque com uma bola prateada gigante.', 'O Epcot fica aqui.', 'Tenho um parque de safári chamado Animal Kingdom.',
      'Fico em Orlando.', 'Sou o destino de viagem mais sonhado das crianças brasileiras.', 'Meu castelo é o da Cinderela.', 'Sou o lugar "mais mágico da Terra".',
      'Tenho a Main Street e o Magic Kingdom.', 'Fico na Flórida.', 'Mickey Mouse é meu anfitrião.', 'Fico nos Estados Unidos.',
      'Sou o complexo de parques mais visitado do mundo.', 'Recebo mais de 50 milhões de visitantes por ano.', 'Sou um parque de diversões.', 'Meu nome vem de Walt.',
    ] },
  ],
  C: [
    { answer: 'Bicicleta', clues: [
      'Minha primeira versão não tinha pedais: a pessoa empurrava com os pés.', 'Fui inventada na Alemanha, no século 19.', 'Já tive a roda da frente muito maior que a de trás.', 'Tenho corrente, câmbio e freios.',
      'Fui essencial para a liberdade das mulheres no século 19.', 'Minha corrida mais famosa é o Tour de France.', 'Sou o meio de transporte mais usado na Holanda.', 'Existem versões com uma roda, duas e três.',
      'Posso ser de corrida, de montanha ou dobrável.', 'Uso guidão, selim e pedais.', 'Não uso combustível.', 'Muita gente aprende a me usar com rodinhas.',
      'Dizem que ninguém esquece como me usar.', 'Tenho duas rodas.', 'Existo também na versão ergométrica, parada.', 'Sou movida pela força das pernas.',
      'Preciso de equilíbrio para andar.', 'Sou um veículo.', 'Meu apelido é "bike" ou "magrela".', 'Meu nome começa com B.',
    ] },
    { answer: 'Café', clues: [
      'Nasci na Etiópia, segundo a lenda, descoberto por um pastor de cabras.', 'Sou uma semente de uma fruta vermelha.', 'Cheguei ao Brasil em 1727, por Francisco de Melo Palheta.', 'Fui a base da economia brasileira por mais de um século.',
      'Fiz a riqueza do Vale do Paraíba e do oeste paulista.', 'Existe uma bolsa de valores em Santos por minha causa.', 'Minhas variedades mais famosas são arábica e robusta.', 'Sou torrado antes de virar pó.',
      'Sou a segunda mercadoria mais negociada do mundo.', 'Tenho uma substância que tira o sono.', 'Sou vendido em cápsulas, grãos ou pó.', 'Posso ser expresso, coado ou com leite.',
      'Sou a bebida mais consumida no Brasil depois da água.', 'O Brasil é meu maior produtor mundial.', 'Sou servido quente, em xícara.', 'Muita gente não acorda sem mim.',
      'Sou uma bebida escura e amarga.', 'Combino com pão na chapa de manhã.', 'Sou servido em padarias e em lojas só minhas.', 'Meu nome tem quatro letras e começa com C.',
    ] },
    { answer: 'Telefone celular', clues: [
      'Minha primeira ligação foi feita em 1973, em Nova York.', 'Meu primeiro modelo comercial pesava quase 1 kg.', 'Fui chamado de "tijolão".', 'Cheguei ao Brasil em 1990.',
      'Meu primeiro jogo famoso foi o da cobrinha.', 'Já tive tampa que abria e fechava.', 'A Nokia e a Motorola dominaram meu começo.', 'Uso um chip pequeno com número.',
      'Hoje tenho câmera, GPS e internet.', 'Em 2007 a Apple mudou minha história.', 'Uso redes chamadas 4G e 5G.', 'Preciso ser carregado todo dia.',
      'Tenho aplicativos.', 'A maioria das pessoas dorme com um ao lado.', 'Existem versões Android e iPhone.', 'Tiro fotos e mando mensagens.',
      'Caibo no bolso.', 'Sou usado para falar com pessoas a distância.', 'Sou um aparelho sem fio que anda com você.', 'Meu nome começa com C, ou "smartphone".',
    ] },
    { answer: 'Xadrez', clues: [
      'Nasci na Índia, há cerca de 1.500 anos.', 'Meu nome antigo era chaturanga.', 'Cheguei à Europa pelos árabes e pela Pérsia.', 'A palavra "xeque-mate" vem do persa "o rei morreu".',
      'Sou disputado em tabuleiro de 64 casas.', 'Cada jogador começa com 16 peças.', 'Um computador chamado Deep Blue me venceu contra o campeão mundial em 1997.', 'Magnus Carlsen e Garry Kasparov são meus campeões famosos.',
      'Uma série da Netflix sobre mim se chama "O Gambito da Rainha".', 'Minhas partidas podem ter relógio.', 'Minha peça mais poderosa é a dama.', 'Tenho torres, cavalos e bispos.',
      'Meu objetivo é capturar o rei do adversário.', 'Minhas casas são claras e escuras.', 'O peão é minha peça mais fraca.', 'Sou considerado um esporte.',
      'Sou um jogo de estratégia para dois.', 'Minhas peças são brancas e pretas.', 'Sou o jogo de tabuleiro mais famoso do mundo.', 'Meu nome começa com X.',
    ] },
    { answer: 'Chocolate', clues: [
      'Meus grãos eram usados como moeda pelos astecas.', 'Os maias me bebiam amargo e apimentado.', 'Meu nome vem do náuatle "xocolatl".', 'Cheguei à Europa com os espanhóis, no século 16.',
      'A Suíça e a Bélgica são famosas por me fabricar.', 'Meus grãos crescem em vagens, numa árvore chamada cacaueiro.', 'A Bahia e o Pará me produzem no Brasil.', 'Existo nas versões amargo, ao leite e branco.',
      'Tenho uma substância que dá sensação de bem-estar.', 'Sou perigoso para cachorros.', 'Willy Wonka tinha uma fábrica minha.', 'Sou derretido para fazer fondue e brigadeiro.',
      'Sou dado de presente na Páscoa, em forma de ovo.', 'Sou feito de cacau, açúcar e leite.', 'Sou vendido em barra ou bombom.', 'Derreto na boca e na mão.',
      'Sou marrom e doce.', 'Sou o doce mais amado do mundo.', 'Sou a matéria-prima do brigadeiro.', 'Meu nome começa com C.',
    ] },
    { answer: 'Guitarra', clues: [
      'Nasci nos anos 1930 para tocar mais alto que os metais das big bands.', 'Meus primeiros modelos foram apelidados de "frigideira".', 'Leo Fender e Les Paul me deram forma.', 'Preciso de amplificador para ser ouvida.',
      'Tenho captadores que transformam vibração em sinal elétrico.', 'Uso cordas de aço.', 'Sou a alma do rock and roll.', 'Jimi Hendrix já me tocou com os dentes e me queimou no palco.',
      'Meus modelos famosos são Stratocaster, Telecaster e Les Paul.', 'Posso ter distorção, wah-wah e delay.', 'Fazer "solo" comigo é o sonho de muitos adolescentes.', 'Tenho braço, corpo e trastes.',
      'Geralmente tenho seis cordas.', 'Sou tocada com palheta ou com os dedos.', 'Sou a irmã elétrica do violão.', 'Existe uma versão minha chamada baixo, com quatro cordas.',
      'Sou um instrumento musical.', 'Sou de cordas.', 'Sou elétrica.', 'Meu nome começa com G.',
    ] },
    { answer: 'Óculos', clues: [
      'Fui inventado na Itália, no século 13.', 'Meus primeiros modelos eram presos ao nariz, sem hastes.', 'Benjamin Franklin criou minha versão bifocal.', 'Existo com lentes côncavas e convexas.',
      'Corrijo miopia, hipermetropia e astigmatismo.', 'Tenho versões de grau, de sol e de proteção.', 'Um oftalmologista prescreve minhas lentes.', 'Posso ter armação de metal ou acetato.',
      'Fico embaçado quando você entra no banho quente.', 'Harry Potter usa um modelo redondo.', 'John Lennon me deixou famoso.', 'Ray-Ban é uma das minhas marcas mais famosas.',
      'Existe uma versão minha para ver filmes em 3D.', 'Posso ser de natação ou de mergulho.', 'Tenho duas lentes e duas hastes.', 'Fico apoiado no nariz e nas orelhas.',
      'Ajudo a enxergar melhor.', 'Sou usado no rosto.', 'Quem tem miopia não vive sem mim.', 'Meu nome começa com Ó.',
    ] },
    { answer: 'Pizza', clues: [
      'Meus ancestrais eram pães achatados do Egito e da Grécia.', 'Nasci como comida de pobre em Nápoles.', 'Minha versão mais famosa foi feita para uma rainha, em 1889.', 'A Margherita tem as cores da bandeira italiana.',
      'Cheguei ao Brasil com os imigrantes italianos, em São Paulo.', 'O bairro do Brás e o Bixiga são famosos por mim.', 'São Paulo é uma das cidades que mais me consome no mundo.', 'Sou assada em forno a lenha ou elétrico.',
      'Minha massa é de farinha, água, fermento e sal.', 'Minha base geralmente leva molho de tomate.', 'Sou cortada em fatias triangulares.', 'Tenho versões de calabresa, portuguesa e quatro queijos.',
      'No Brasil me comem com ketchup, o que os italianos odeiam.', 'Chego em casa numa caixa quadrada.', 'Sou redonda.', 'Sou coberta de queijo derretido.',
      'Sou uma comida italiana.', 'Sou o prato mais pedido por delivery.', 'Sou a comida de domingo à noite.', 'Meu nome começa com P.',
    ] },
    { answer: 'Dinheiro', clues: [
      'Antes de mim, as pessoas trocavam mercadorias.', 'Sal, conchas e gado já fizeram meu papel.', 'Minhas primeiras moedas foram cunhadas na Lídia, há 2.600 anos.', 'Os chineses criaram minha versão em papel.',
      'Sou guardado em bancos e cofres.', 'Já fui chamado de cruzeiro, cruzado e real no Brasil.', 'Tenho versões de metal e de papel.', 'Hoje existo também em forma digital e em cartão.',
      'O Pix me move sem papel.', 'Dizem que não trago felicidade.', 'Dizem que não nasço em árvore.', 'Sou impresso pela Casa da Moeda.',
      'Tenho animais estampados nas notas brasileiras.', 'Sou dólar, euro, iene e real.', 'Com ele se compra quase tudo.', 'Todo mundo trabalha para me ganhar.',
      'Sou usado para pagar.', 'Cabe na carteira.', 'Meu apelido é "grana" ou "bufunfa".', 'Meu nome começa com D.',
    ] },
    { answer: 'Dado', clues: [
      'Existo há mais de 5 mil anos.', 'Fui feito de ossos de animais no começo.', 'Fui encontrado em tumbas do Egito e da Mesopotâmia.', 'Soldados romanos me usavam para apostar.',
      'Júlio César disse "a sorte está lançada" falando de mim.', 'Sou proibido em alguns lugares por causa das apostas.', 'Existo com 4, 8, 12 e 20 lados no RPG.', 'Meus lados opostos sempre somam sete.',
      'Sou jogado num copo ou na mão.', 'Sou usado no gamão, no ludo e no banco imobiliário.', 'Meus pontos são chamados de "pips".', 'Sou usado para decidir quantas casas andar.',
      'Tenho seis faces.', 'Sou um cubo pequeno.', 'Tenho pontinhos de um a seis.', 'Sou usado em cassinos, em jogos de tabuleiro e no War.',
      'Sou o símbolo da sorte e do acaso.', 'Sou jogado no jogo Imagem e Ação.', 'Sou um objeto de jogo.', 'Meu nome tem quatro letras e começa com D.',
    ] },
  ],
  A: [
    { answer: '1500', clues: [
      'Fui o último ano do século 15.', 'Vasco da Gama já tinha chegado à Índia dois anos antes de mim.', 'Neste ano nasceu Carlos V, imperador do Sacro Império.', 'Em mim, Pedro Álvares Cabral saiu de Lisboa com 13 navios.',
      'A frota fez uma parada no Brasil a caminho da Índia.', 'A esquadra viu um monte e o chamou de Monte Pascoal.', 'Em mim a esquadra ancorou em Porto Seguro, na Bahia.', 'Pero Vaz de Caminha escreveu uma carta ao rei neste ano.',
      'A carta dizia que "em se plantando, tudo dá".', 'A primeira missa no Brasil foi rezada em mim.', 'A terra foi chamada de Ilha de Vera Cruz.', 'O rei de Portugal era Dom Manuel I.',
      'Terminei um século e comecei uma era.', 'Sou o marco do início da história do Brasil.', 'Os portugueses chegaram ao Brasil em mim.', 'Cabral "descobriu" o Brasil em 22 de abril de mim.',
      'Sou o ano mais decorado nas aulas de história do Brasil.', 'Sou um ano do fim do século 15.', 'Sou um número redondo.', 'Sou o ano do descobrimento do Brasil.',
    ] },
    { answer: '1822', clues: [
      'Neste ano nasceu Louis Pasteur.', 'Neste ano foi decifrada a escrita dos hieróglifos por Champollion.', 'Em mim a Grécia declarou independência do Império Otomano.', 'Fui um ano da primeira metade do século 19.',
      'Dom João VI já tinha voltado a Portugal no ano anterior.', 'As Cortes de Lisboa exigiam a volta do príncipe.', 'Em janeiro de mim aconteceu o "Dia do Fico".', 'Em mim Maria Leopoldina governou como regente por alguns dias.',
      'Em setembro de mim, um príncipe estava viajando de Santos para São Paulo.', 'Uma carta chegou às margens de um riacho.', 'O grito foi dado às margens do Ipiranga.', 'Em dezembro de mim um imperador foi coroado.',
      'Dom Pedro I foi coroado em mim.', 'Em mim o Brasil deixou de ser colônia.', 'O "Independência ou Morte" aconteceu em 7 de setembro de mim.', 'Sou o ano da Independência do Brasil.',
      'Sou o ano em que o Brasil virou Império.', 'Sou o segundo ano mais decorado da história do Brasil.', 'Sou um ano do século 19.', 'Termino com 22.',
    ] },
    { answer: '1969', clues: [
      'Neste ano foi criada a primeira conexão da ARPANET, avó da internet.', 'A Boeing fez o primeiro voo do 747.', 'O Concorde fez seu primeiro voo.', 'Neste ano nasceram Jennifer Aniston e Jennifer Lopez.',
      'No Brasil, era a ditadura militar, com o AI-5 em vigor.', 'Emílio Garrastazu Médici assumiu a presidência em mim.', 'Pelé fez seu milésimo gol em novembro de mim.', 'Os Beatles atravessaram a faixa de pedestres de Abbey Road em mim.',
      'A Vila Sésamo estreou na TV americana.', 'O festival de Woodstock aconteceu em agosto de mim.', 'Neste ano os Beatles fizeram o último show, no telhado.', 'Fui um ano da Guerra Fria e da corrida espacial.',
      'A Apollo 11 foi lançada em julho de mim.', 'Neil Armstrong e Buzz Aldrin pisaram na Lua em mim.', '"Um pequeno passo para o homem" foi dito em mim.', 'Sou o ano em que o homem chegou à Lua.',
      'Sou um ano do fim dos anos 60.', 'Sou um ano do século 20.', 'Termino com 69.', 'Meus dígitos são 1, 9, 6 e 9.',
    ] },
    { answer: '2002', clues: [
      'Neste ano o euro começou a circular em notas e moedas.', 'A Suíça entrou na ONU em mim.', 'Neste ano o Timor-Leste virou um país independente.', 'Em mim Michael Jackson mostrou o filho na varanda de um hotel.',
      'O filme "Cidade de Deus" estreou em mim.', 'Neste ano nasceu a rede social Friendster.', 'Em mim o Big Brother Brasil teve sua primeira edição.', 'Em mim o Brasil elegeu um ex-metalúrgico presidente.',
      'Lula venceu a eleição em mim, contra José Serra.', 'A Copa do Mundo foi na Ásia pela primeira vez.', 'A Copa foi na Coreia do Sul e no Japão.', 'Ronaldo Fenômeno voltou de lesão e foi artilheiro.',
      'Ronaldo usou um corte de cabelo estranho, só com um tufo na frente.', 'Cafu levantou a taça.', 'Rivaldo, Ronaldo e Ronaldinho formaram os "3 Rs".', 'O Brasil venceu a Alemanha na final por 2 a 0.',
      'Sou o ano do pentacampeonato brasileiro.', 'Sou um ano do começo do século 21.', 'Sou o último ano em que o Brasil ganhou uma Copa.', 'Termino com 02.',
    ] },
    { answer: '1994', clues: [
      'Neste ano o Canal da Mancha ganhou um túnel ligando França e Inglaterra.', 'Nelson Mandela foi eleito presidente da África do Sul em mim.', 'Em mim ocorreu o genocídio de Ruanda.', 'Kurt Cobain morreu em abril de mim.',
      'Neste ano estreou a série "Friends".', 'Os filmes "O Rei Leão", "Forrest Gump" e "Pulp Fiction" são de mim.', 'A Sony lançou o primeiro PlayStation em mim.', 'Em mim Ayrton Senna morreu em Ímola.',
      'No Brasil, uma nova moeda começou a circular em 1º de julho de mim.', 'O Plano Real foi lançado em mim.', 'Fernando Henrique Cardoso foi eleito presidente em mim.', 'A Copa do Mundo foi nos Estados Unidos.',
      'Romário e Bebeto fizeram a dança do berço.', 'Roberto Baggio errou o pênalti decisivo.', 'A final foi decidida nos pênaltis contra a Itália.', 'O Brasil venceu a Copa depois de 24 anos de jejum.',
      'Sou o ano do tetracampeonato.', 'Sou um ano dos anos 90.', 'Sou o ano do Real e do tetra.', 'Termino com 94.',
    ] },
    { answer: '1888', clues: [
      'Neste ano nasceu o pintor Giorgio de Chirico.', 'Van Gogh pintou "Os Girassóis" em mim.', 'Jack, o Estripador, aterrorizou Londres em mim.', 'A Kodak lançou a primeira câmera para o público em mim.',
      'A Torre Eiffel estava em construção.', 'No Brasil, era o Segundo Reinado, com Dom Pedro II.', 'O imperador estava na Europa, doente.', 'A princesa Isabel governava como regente.',
      'Uma lei com apenas dois artigos foi assinada em maio de mim.', 'A lei foi escrita por Rodrigo Silva e aprovada em poucos dias.', 'A princesa assinou a lei com uma pena de ouro.', 'A lei acabou com uma prática de mais de 300 anos no Brasil.',
      'Fui o ano em que o Brasil foi o último país das Américas a fazer isso.', 'Em mim foi assinada a Lei Áurea.', 'A escravidão foi abolida em 13 de maio de mim.', 'No ano seguinte a mim, a República foi proclamada.',
      'Sou o ano da abolição da escravatura no Brasil.', 'Sou um ano do século 19.', 'Tenho três oitos.', 'Termino com 88.',
    ] },
    { answer: '2020', clues: [
      'Neste ano o Reino Unido saiu oficialmente da União Europeia.', 'Kobe Bryant morreu num acidente de helicóptero em janeiro de mim.', 'O filme "Parasita" ganhou o Oscar de melhor filme em mim.', 'Em mim a SpaceX levou astronautas ao espaço pela primeira vez.',
      'Em mim Joe Biden foi eleito presidente dos Estados Unidos.', 'O Carnaval do ano seguinte foi cancelado por minha causa.', 'As Olimpíadas de Tóquio foram adiadas em mim.', 'Em mim o Big Brother Brasil 20 bateu recorde de audiência.',
      'As escolas fecharam e as aulas viraram online.', 'As pessoas fizeram pão caseiro e lives em casa.', 'O álcool em gel sumiu das prateleiras.', 'Máscaras viraram obrigatórias.',
      'A palavra "quarentena" virou rotina.', 'A OMS declarou pandemia em março de mim.', 'Um vírus que começou na China parou o mundo em mim.', 'Sou o ano da pandemia de Covid-19.',
      'Sou o primeiro ano de uma década.', 'Sou um ano bissexto.', 'Meus dois últimos números são iguais aos dois primeiros.', 'Meus dígitos são só 2 e 0.',
    ] },
    { answer: '1889', clues: [
      'Neste ano nasceram Charlie Chaplin e Adolf Hitler.', 'A Torre Eiffel foi inaugurada em mim.', 'Van Gogh pintou "A Noite Estrelada" em mim.', 'A Nintendo foi fundada em mim, vendendo cartas de baralho.',
      'Fui o ano seguinte à abolição da escravatura no Brasil.', 'Os fazendeiros estavam bravos com a princesa Isabel.', 'O imperador Dom Pedro II estava velho e doente.', 'Os militares estavam insatisfeitos com o Império.',
      'Um marechal liderou tropas no Rio de Janeiro em novembro de mim.', 'Deodoro da Fonseca deu o golpe em mim.', 'A família imperial foi para o exílio em mim.', 'A bandeira ganhou a frase "Ordem e Progresso".',
      'O Brasil deixou de ser uma monarquia em mim.', 'A República foi proclamada em 15 de novembro de mim.', 'Sou o ano da Proclamação da República.', 'O feriado de 15 de novembro lembra de mim.',
      'Sou o último ano do Império do Brasil.', 'Sou um ano do século 19.', 'Sou um ano ímpar do fim do século 19.', 'Termino com 89.',
    ] },
    { answer: '1985', clues: [
      'Neste ano Mikhail Gorbachev assumiu a União Soviética.', 'O naufrágio do Titanic foi encontrado no fundo do mar em mim.', 'A Nintendo lançou o "Super Mario Bros." em mim.', 'Em mim foi lançado o Windows 1.0.',
      'O filme "De Volta para o Futuro" é de mim.', 'O show "Live Aid" aconteceu em mim.', 'Em mim aconteceu a primeira edição do Rock in Rio.', 'Queen, Iron Maiden e AC/DC tocaram no Brasil em janeiro de mim.',
      'A música "We Are the World" foi gravada em mim.', 'No Brasil, o regime militar chegou ao fim em mim.', 'Tancredo Neves foi eleito, mas morreu antes de tomar posse.', 'José Sarney assumiu a presidência em mim.',
      'Sou o ano da redemocratização do Brasil.', 'Sou o ano do fim da ditadura militar.', 'Sou um ano do meio dos anos 80.', 'Termino com 85.',
      'Sou um ano do século 20.', 'Vim vinte e um anos depois do golpe de 1964.', 'Sou um ano ímpar.', 'Tenho os dígitos 1, 9, 8 e 5.',
    ] },
    { answer: '2016', clues: [
      'Neste ano o Reino Unido votou pelo Brexit.', 'Donald Trump foi eleito presidente dos Estados Unidos em mim.', 'David Bowie e Prince morreram em mim.', 'O jogo Pokémon Go virou febre em mim.',
      'Leonardo DiCaprio finalmente ganhou o Oscar em mim.', 'O Leicester foi campeão inglês contra todas as chances.', 'Em mim Cristiano Ronaldo ganhou a Eurocopa com Portugal.', 'Em mim Dilma Rousseff sofreu impeachment.',
      'Michel Temer assumiu a presidência em mim.', 'O avião da Chapecoense caiu em novembro de mim.', 'Usain Bolt correu suas últimas Olimpíadas em mim.', 'Michael Phelps ganhou suas últimas medalhas de ouro em mim.',
      'Rafaela Silva e Thiago Braz ganharam ouro em mim.', 'Neymar marcou o pênalti decisivo na final olímpica em mim.', 'O Brasil ganhou o primeiro ouro olímpico no futebol.', 'As Olimpíadas foram na América do Sul pela primeira vez.',
      'Sou o ano das Olimpíadas do Rio de Janeiro.', 'Sou um ano bissexto.', 'Sou um ano da década de 2010.', 'Termino com 16.',
    ] },
  ],
};

// lotes extras de cartas: qualquer arquivo cardsN.js desta pasta entra sozinho.
// Cada lote exporta um objeto (CARDS2, CARDS3, ...) com as mesmas categorias.
const fs = require('fs');
const lotes = fs.readdirSync(__dirname)
  .filter(f => /^cards\d+\.js$/.test(f))
  .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));
for (const f of lotes) {
  try {
    const mod = require('./' + f);
    const lote = mod.CARDS || mod[Object.keys(mod).find(k => /^CARDS/.test(k))];
    if (!lote) { console.log(`${f}: nenhum lote de cartas exportado.`); continue; }
    for (const k of Object.keys(lote)) CARDS[k] = (CARDS[k] || []).concat(lote[k]);
  } catch (e) { console.log(`${f} não carregado:`, e.message); }
}
for (const k of Object.keys(CATEGORIES)) CARDS[k] = CARDS[k] || [];

module.exports = { CATEGORIES, CARDS };
