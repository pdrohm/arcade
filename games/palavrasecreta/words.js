// Palavra Secreta — banco de palavras em pt-BR (Mega Senha).
// Cada categoria guarda as palavras separadas por dificuldade (1 fácil, 2 médio, 3 difícil).
// "aleatorio" não é uma lista: quer dizer "todas as categorias".
const CATS = [
  { id: 'aleatorio', name: 'Aleatório' },
  { id: 'animais', name: 'Animais' },
  { id: 'objetos', name: 'Objetos' },
  { id: 'comidas', name: 'Comidas' },
  { id: 'filmes_series', name: 'Filmes e séries' },
  { id: 'musica', name: 'Música' },
  { id: 'esportes', name: 'Esportes' },
  { id: 'profissoes', name: 'Profissões' },
  { id: 'lugares', name: 'Lugares' },
  { id: 'brasil', name: 'Brasil' },
  { id: 'tecnologia', name: 'Tecnologia' },
  { id: 'cultura_pop', name: 'Cultura pop' },
];

const BANK = {
  animais: {
    1: ["Cachorro", "Gato", "Cavalo", "Vaca", "Porco", "Galinha", "Pato", "Elefante", "Leão", "Tigre", "Macaco", "Urso", "Girafa", "Zebra", "Coelho", "Rato", "Cobra", "Peixe", "Tubarão", "Baleia", "Aranha", "Abelha", "Formiga", "Borboleta", "Pinguim", "Tartaruga", "Sapo", "Jacaré"],
    2: ["Golfinho", "Foca", "Lobo", "Raposa", "Veado", "Águia", "Coruja", "Papagaio", "Tucano", "Canguru", "Camelo", "Rinoceronte", "Hipopótamo", "Panda", "Gorila", "Morcego", "Ovelha", "Cabra", "Búfalo", "Avestruz", "Flamingo", "Pelicano", "Escorpião", "Lagarto", "Caranguejo"],
    3: ["Camaleão", "Preguiça", "Capivara", "Tamanduá", "Onça", "Puma", "Hiena", "Chacal", "Lhama", "Alpaca", "Polvo", "Caracol", "Água-viva", "Ouriço", "Gambá", "Quati", "Mico"],
  },
  objetos: {
    1: ["Mesa", "Cadeira", "Cama", "Sofá", "Televisão", "Geladeira", "Fogão", "Copo", "Prato", "Garfo", "Faca", "Colher", "Panela", "Chave", "Porta", "Janela", "Espelho", "Travesseiro", "Cobertor", "Toalha", "Sabonete", "Escova", "Pente", "Tesoura", "Guarda-chuva", "Chinelo", "Sapato", "Óculos"],
    2: ["Vassoura", "Escada", "Martelo", "Prego", "Parafuso", "Alicate", "Corda", "Balde", "Esponja", "Vela", "Fósforo", "Isqueiro", "Relógio", "Carteira", "Mochila", "Bolsa", "Cinto", "Boné", "Luva", "Cachecol", "Guarda-roupa", "Estante", "Almofada", "Ventilador", "Liquidificador"],
    3: ["Alfinete", "Dedal", "Pinça", "Lanterna", "Termômetro", "Extintor", "Cadeado", "Antena", "Chaveiro", "Abridor", "Espátula", "Peneira", "Rolo de macarrão", "Varal", "Cabide", "Sacola", "Cortina"],
  },
  comidas: {
    1: ["Pizza", "Hambúrguer", "Arroz", "Feijão", "Macarrão", "Batata frita", "Frango", "Carne", "Pão", "Bolo", "Sorvete", "Chocolate", "Pipoca", "Café", "Suco", "Leite", "Queijo", "Açaí", "Ovo", "Salada", "Feijoada", "Churrasco", "Coxinha", "Pastel", "Brigadeiro", "Refrigerante", "Água", "Banana"],
    2: ["Lasanha", "Risoto", "Sushi", "Lanche", "Vitamina", "Milkshake", "Cachorro-quente", "Empanada", "Torta", "Pudim", "Manga", "Abacaxi", "Melancia", "Morango", "Uva", "Maçã", "Laranja", "Limão", "Abacate", "Cenoura", "Tomate", "Cebola", "Alho", "Pepino", "Beterraba"],
    3: ["Estrogonofe", "Moqueca", "Vatapá", "Acarajé", "Tapioca", "Cuscuz", "Farofa", "Rapadura", "Paçoca", "Cocada", "Quindim", "Canjica", "Maionese", "Ketchup", "Mostarda", "Vinagre", "Azeite"],
  },
  filmes_series: {
    1: ["Titanic", "Frozen", "Toy Story", "Shrek", "Vingadores", "Batman", "Homem-Aranha", "Superman", "Star Wars", "Harry Potter", "Matrix", "Jurassic Park", "Chaves", "Friends", "Round 6", "Stranger Things", "Big Brother Brasil", "A Fazenda", "Turma da Mônica", "Sítio do Pica-pau Amarelo", "Rei Leão", "Aladdin", "Cinderela", "Branca de Neve", "Moana", "Coco", "Up", "Wall-e"],
    2: ["Avatar", "Gladiador", "Coringa", "Divertida Mente", "Procurando Nemo", "Carros", "Madagascar", "Zootopia", "Enrolados", "Malévola", "Rocky", "Rambo", "Duro de Matar", "De Volta para o Futuro", "Ghostbusters", "Karatê Kid", "Jumanji", "Homem de Ferro", "Pantera Negra", "Thor", "Hulk", "Capitã Marvel", "Wolverine", "Deadpool", "Esqueceram de Mim"],
    3: ["Avenida Brasil", "Chiquititas", "Malhação", "Caminho das Índias", "Roda a Roda", "Programa do Ratinho", "Domingão", "Fantástico", "Jornal Nacional", "Zorra Total", "Escrava Isaura", "Laços de Família", "O Auto da Compadecida", "Cidade de Deus", "Tropa de Elite", "Central do Brasil", "Bacurau"],
  },
  musica: {
    1: ["Violão", "Guitarra", "Bateria", "Piano", "Microfone", "Karaokê", "Rock", "Sertanejo", "Funk", "Pagode", "Samba", "Forró", "Rap", "Reggae", "Anitta", "Beyoncé", "Madonna", "Michael Jackson", "Elvis Presley", "Roberto Carlos", "Chico Buarque", "Caetano Veloso", "Gilberto Gil", "Pabllo Vittar", "Show", "Palco", "Disco", "Fone de ouvido"],
    2: ["Flauta", "Violino", "Saxofone", "Trompete", "Baixo", "Teclado", "Pandeiro", "Tambor", "Coral", "Banda", "Festival", "Ídolo", "Playback", "Refrão", "Melodia", "Ritmo", "Axé", "Bossa Nova", "MPB", "Rihanna", "Shakira", "Adele", "Elton John", "Queen", "Beatles"],
    3: ["Harpa", "Acordeão", "Cavaquinho", "Berimbau", "Trombone", "Clarinete", "Contrabaixo", "Sinfonia", "Ópera", "Maestro", "Partitura", "Turnê", "Autotune", "Freestyle", "Trap", "K-pop", "Beethoven"],
  },
  esportes: {
    1: ["Futebol", "Vôlei", "Basquete", "Tênis", "Natação", "Corrida", "Ciclismo", "Boxe", "Judô", "Karatê", "Skate", "Surfe", "Ginástica", "Pelé", "Neymar", "Messi", "Cristiano Ronaldo", "Olimpíadas", "Copa do Mundo", "Gol", "Pênalti", "Bola", "Chuteira", "Apito", "Juiz", "Time", "Estádio", "Medalha"],
    2: ["Handebol", "Rugby", "Golfe", "Boliche", "Xadrez", "Maratona", "Triatlo", "Halterofilismo", "Luta livre", "Esgrima", "Remo", "Iatismo", "Patinação", "Atletismo", "Vôlei de praia", "Muay Thai", "Jiu-jitsu", "Fórmula 1", "Motocross", "Arco e flecha", "Salto em distância", "Salto com vara", "Ronaldinho Gaúcho", "Zico", "Romário"],
    3: ["Taekwondo", "Squash", "Polo aquático", "Hipismo", "Nado sincronizado", "Sinuca", "Peteca", "Capoeira", "Bocha", "Frescobol", "Paraquedismo", "Escalada", "Rapel", "Crossfit", "Pilates", "Kart", "Windsurfe"],
  },
  profissoes: {
    1: ["Médico", "Professor", "Bombeiro", "Policial", "Dentista", "Advogado", "Engenheiro", "Cozinheiro", "Garçom", "Cabeleireiro", "Pedreiro", "Eletricista", "Encanador", "Motorista", "Piloto", "Enfermeiro", "Veterinário", "Padeiro", "Açougueiro", "Pescador", "Agricultor", "Costureira", "Faxineira", "Vendedor", "Caixa", "Segurança", "Jardineiro", "Mecânico"],
    2: ["Youtuber", "Fisioterapeuta", "Psicólogo", "Nutricionista", "Farmacêutico", "Contador", "Arquiteto", "Jornalista", "Fotógrafo", "Tradutor", "Bibliotecário", "Marceneiro", "Pintor", "Recepcionista", "Manicure", "Programador", "Designer", "Corretor de imóveis", "Sociólogo", "Diplomata", "Astronauta", "Locutor", "Personal trainer", "Influencer", "Ator"],
    3: ["Zootecnista", "Geólogo", "Astrônomo", "Meteorologista", "Oceanógrafo", "Paleontólogo", "Antropólogo", "Arqueólogo", "Cartógrafo", "Ourives", "Alfaiate", "Sapateiro", "Funileiro", "Tabelião", "Estivador", "Lobista", "Coveiro"],
  },
  lugares: {
    1: ["Praia", "Aeroporto", "Padaria", "Hospital", "Escola", "Igreja", "Mercado", "Farmácia", "Cinema", "Parque", "Shopping", "Restaurante", "Hotel", "Banheiro", "Cozinha", "Escritório", "Estádio", "Biblioteca", "Fazenda", "Floresta", "Montanha", "Rio", "Deserto", "Ilha", "Praça", "Zoológico", "Museu", "Ponte"],
    2: ["Paris", "Egito", "Japão", "Índia", "México", "Nova York", "Londres", "Roma", "Veneza", "Havaí", "Alasca", "Antártida", "Saara", "Groenlândia", "Polo Norte", "Vaticano", "Torre Eiffel", "Muralha da China", "Pirâmides", "Vulcão", "Cachoeira", "Caverna", "Vinhedo", "Savana", "Iceberg"],
    3: ["Machu Picchu", "Chernobyl", "Estreito de Bering", "Triângulo das Bermudas", "Monte Everest", "Fossa das Marianas", "Ilhas Galápagos", "Serengeti", "Sibéria", "Patagônia", "Mar Morto", "Estação Espacial", "Polo Sul", "Vinícola", "Catacumbas", "Observatório", "Planetário"],
  },
  brasil: {
    1: ["Carnaval", "Cristo Redentor", "Copacabana", "Samba", "Futebol", "Havaianas", "Ipanema", "Maracanã", "Amazônia", "Pantanal", "Favela", "Carioca", "Paulista", "Nordestino", "Gaúcho", "Baiano", "Mineiro", "Funk", "Sertanejo", "Axé", "Pagode", "Bloco de carnaval", "Trio elétrico", "Rede de dormir", "Chinelo", "Sunga", "Biquíni", "Escola de samba"],
    2: ["Capoeira", "Forró", "Bossa nova", "Bumba meu boi", "Boi-bumbá", "Jangada", "Cangaço", "Lampião", "Saci-pererê", "Curupira", "Boto cor-de-rosa", "Jeitinho brasileiro", "Pelourinho", "Sertão", "Cerrado", "Caatinga", "Boi de Parintins", "Fla-Flu", "Frevo", "Maracatu", "Berimbau", "Cuíca", "Repentista", "Cordel", "Vaquejada"],
    3: ["Umbanda", "Candomblé", "Orixá", "Quilombo", "Bandeirante", "Vaqueiro", "Tropicália", "Cangaceiro", "Iemanjá", "Zumbi dos Palmares", "Alforria", "Engenho", "Coronelismo", "Retirante", "Sesmaria", "Jangadeiro", "Pajelança"],
  },
  tecnologia: {
    1: ["Pix", "Wi-Fi", "Celular", "Senha", "Internet", "Computador", "Notebook", "Teclado", "Mouse", "Impressora", "Televisão", "Controle remoto", "Fone de ouvido", "Carregador", "Bateria", "Aplicativo", "WhatsApp", "Instagram", "Facebook", "Câmera", "Tablet", "E-mail", "Site", "Download", "Vídeo chamada", "Software", "Hardware", "Google"],
    2: ["Bluetooth", "Inteligência artificial", "Nuvem", "Criptomoeda", "Streaming", "Realidade virtual", "Impressora 3D", "Código de barras", "QR code", "Chip", "Placa-mãe", "Processador", "Servidor", "Antivírus", "Robô", "Satélite", "Drone", "GPS", "Fibra óptica", "Roteador", "Pendrive", "Biometria", "Criptografia", "Chatbot", "Firewall"],
    3: ["Blockchain", "Metaverso", "Big data", "Machine learning", "Realidade aumentada", "Nanotecnologia", "Semicondutor", "Firmware", "Kernel", "API", "Deep learning", "Reconhecimento facial", "Algoritmo", "Autenticação", "Token", "Open source", "Backend"],
  },
  cultura_pop: {
    1: ["Mario", "Pokémon", "TikTok", "Homem-Aranha", "Barbie", "Emoji", "Batman", "Superman", "Mickey Mouse", "Frozen", "Minecraft", "Naruto", "Pikachu", "Star Wars", "Harry Potter", "Netflix", "Meme", "Selfie", "Zumbi", "Vampiro", "Princesa", "Super-herói", "Vilão", "Dinossauro", "Desenho animado", "Novela", "Boneca", "Máscara"],
    2: ["Homem de Ferro", "Capitão América", "Hulk", "Thor", "Shrek", "Simpsons", "Bob Esponja", "Cinderela", "Branca de Neve", "Chapeuzinho Vermelho", "Lobisomem", "Bruxa", "Fada", "Dragão", "Roblox", "Fortnite", "GTA", "PlayStation", "Xbox", "Podcast", "Reels", "Hashtag", "Streamer", "Cosplay", "Gamer"],
    3: ["Anime", "Mangá", "Multiverso", "Nerd", "Geek", "Fandom", "Spoiler", "Crossover", "Prequela", "Sequência", "Remake", "Reboot", "Trailer", "Bilheteria", "Roteirista", "Dublagem", "Legendado"],
  },
};

// lista plana { w, cat, d } — o jogo filtra por categoria e dificuldade
const WORDS = [];
for (const [cat, byDiff] of Object.entries(BANK)) for (const [d, list] of Object.entries(byDiff)) for (const w of list) WORDS.push({ w, cat, d: Number(d) });

module.exports = { CATS, BANK, WORDS };
