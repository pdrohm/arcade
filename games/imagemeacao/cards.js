// Categorias e palavras do Imagem e Ação
const CATEGORIES = {
  P: { key: 'P', name: 'Pessoa / Lugar / Animal', short: 'Pessoa, Lugar ou Animal', color: '#facc15', text: '#1a1a1a' },
  O: { key: 'O', name: 'Objeto', short: 'Objeto', color: '#3b82f6', text: '#ffffff' },
  A: { key: 'A', name: 'Ação', short: 'Ação', color: '#f97316', text: '#1a1a1a' },
  D: { key: 'D', name: 'Difícil', short: 'Difícil', color: '#22c55e', text: '#1a1a1a' },
  L: { key: 'L', name: 'Livre', short: 'Livre (qualquer coisa)', color: '#ef4444', text: '#ffffff' },
};

const WORDS = {
  P: [
    'médico', 'bombeiro', 'pirata', 'palhaço', 'professor', 'rei', 'bruxa', 'astronauta', 'mágico',
    'bailarina', 'garçom', 'cientista', 'dentista', 'juiz', 'cantor', 'vampiro', 'ninja', 'cowboy',
    'sereia', 'papai noel', 'carteiro', 'pedreiro', 'policial', 'padre', 'noiva', 'bebê', 'faxineira',
    'praia', 'escola', 'hospital', 'igreja', 'aeroporto', 'cinema', 'fazenda', 'floresta', 'deserto',
    'ilha', 'castelo', 'prisão', 'estádio', 'padaria', 'zoológico', 'cachoeira', 'vulcão', 'shopping',
    'banheiro', 'cozinha', 'circo', 'parque', 'biblioteca', 'academia', 'posto de gasolina',
    'cavalo', 'girafa', 'elefante', 'pinguim', 'tubarão', 'borboleta', 'coruja', 'jacaré', 'tartaruga',
    'macaco', 'canguru', 'polvo', 'galinha', 'cobra', 'leão', 'camelo', 'morcego', 'formiga', 'baleia',
    'caracol', 'zebra', 'porco', 'aranha', 'abelha', 'sapo', 'pavão', 'tucano', 'preguiça', 'rinoceronte',
  ],
  O: [
    'guarda-chuva', 'chave', 'escova de dentes', 'óculos', 'bicicleta', 'violão', 'telefone', 'relógio',
    'cadeira', 'martelo', 'tesoura', 'lâmpada', 'geladeira', 'travesseiro', 'sapato', 'mochila', 'panela',
    'garrafa', 'espelho', 'escada', 'vassoura', 'ventilador', 'balão', 'carrinho de mão', 'âncora',
    'foguete', 'helicóptero', 'submarino', 'pipa', 'bússola', 'lanterna', 'microfone', 'piano', 'tambor',
    'cofre', 'coroa', 'máscara', 'cachimbo', 'ferro de passar', 'secador de cabelo', 'aspirador de pó',
    'canudo', 'colher', 'garfo', 'prego', 'serrote', 'algema', 'binóculo', 'saca-rolhas', 'abajur',
    'grampeador', 'carimbo', 'rede de dormir', 'chuveiro', 'privada', 'batedeira', 'cortina', 'tapete',
    'chinelo', 'gravata', 'luva', 'capacete', 'skate', 'bola de futebol', 'raquete', 'dado', 'baralho',
    'controle remoto', 'fone de ouvido', 'carregador', 'mala', 'cabide', 'pente', 'sabonete', 'barraca',
  ],
  A: [
    'nadar', 'pescar', 'dormir', 'cozinhar', 'dançar', 'escalar', 'esquiar', 'mergulhar', 'espirrar',
    'bocejar', 'escovar os dentes', 'pular corda', 'andar de bicicleta', 'tirar foto', 'varrer',
    'assobiar', 'chorar', 'gargalhar', 'aplaudir', 'cochichar', 'tropeçar', 'escorregar', 'surfar',
    'jogar boliche', 'tocar violão', 'dirigir', 'remar', 'cavar', 'martelar', 'pintar', 'costurar',
    'empurrar', 'puxar', 'abraçar', 'correr', 'beijar', 'roncar', 'soluçar', 'malhar', 'rezar',
    'decolar', 'estacionar', 'engatinhar', 'pintar as unhas', 'fazer a barba', 'plantar', 'regar',
    'apostar corrida', 'patinar', 'torcer', 'lutar boxe', 'pular de paraquedas', 'acenar', 'mentir',
    'espiar', 'cantar no chuveiro', 'lavar louça', 'trocar pneu', 'fazer selfie', 'cair da cama',
    'assar bolo', 'jogar videogame', 'tomar banho', 'passar roupa', 'pentear o cabelo', 'ler jornal',
  ],
  D: [
    'saudade', 'gravidade', 'eco', 'inflação', 'democracia', 'ciúme', 'sonho', 'silêncio', 'madrugada',
    'preguiça', 'coincidência', 'alergia', 'fofoca', 'vertigem', 'sorte', 'feriado', 'vergonha',
    'orgulho', 'nostalgia', 'ansiedade', 'camuflagem', 'telepatia', 'karaokê', 'fuso horário',
    'trânsito', 'imposto', 'aposentadoria', 'gagueira', 'insônia', 'mau humor', 'déjà vu', 'boato',
    'jejum', 'evolução', 'plágio', 'fila', 'dieta', 'atalho', 'pesadelo', 'paciência',
    'engarrafamento', 'entrevista de emprego', 'ressaca', 'mistério', 'tempestade', 'liberdade',
    'timidez', 'reciclagem', 'promoção', 'segunda-feira', 'sinal de wi-fi', 'cheiro', 'eleição',
    'aniversário esquecido', 'mudança', 'aquecimento global', 'cãibra', 'coceira', 'ironia', 'infância',
  ],
  L: [
    'pizza', 'chuva', 'arco-íris', 'guitarra', 'carnaval', 'futebol', 'aniversário', 'casamento',
    'natal', 'festa junina', 'sorvete', 'hambúrguer', 'pipoca', 'brigadeiro', 'feijoada', 'churrasco',
    'açaí', 'pão de queijo', 'dinossauro', 'fantasma', 'robô', 'alienígena', 'super-herói', 'zumbi',
    'unicórnio', 'dragão', 'monstro', 'samba', 'capoeira', 'tênis', 'vôlei', 'xadrez', 'pião',
    'videogame', 'selfie', 'internet', 'lua', 'sol', 'estrela', 'neve', 'terremoto', 'furacão',
    'trovão', 'cometa', 'planeta', 'bolha de sabão', 'pirulito', 'cupcake', 'tatuagem', 'piercing',
    'novela', 'pagode', 'coxinha', 'guaraná', 'caipirinha', 'copa do mundo', 'boneco de neve',
    'castelo de areia', 'montanha-russa', 'circo', 'fogos de artifício', 'pizza de chocolate',
  ],
};

module.exports = { CATEGORIES, WORDS };
