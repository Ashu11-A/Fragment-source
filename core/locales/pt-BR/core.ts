export default {
  'authenticate': {
    'select_bot': 'Selecione seu bot',
    'choose_option': 'Como deseja prosseguir?',
    'registered': 'Cadastrado em:',
    'hello': 'Olá {{name}}',
    'change_token': 'Mudar Token',
    'try_again': 'Tentar Novamente',
    'logout': 'Deslogar'
  },
  'commands': {
    'lang': {
      'sucess': 'Idioma alterado com sucesso!',
      'error': 'Não é possível alterar o idioma do bot!'
    }
  },
  'crypt': {
    'encrypted': 'criptografado',
    'your_password': 'Sua Senha:'
  },
  'database': {
    'starting': 'Iniciando Banco de dados',
    'initialized': 'Banco de dados inicializado com {{length}} entries',
    'invalid_entity': '{{tableName}} Entidade invalida, Entidades carregadas:'
  },
  'discord': {
    'start': 'Iniciando Discord',
    'create': 'Criando o client do Discord',
    'close': 'Destruindo conexão com o Discord',
    'connected': 'Conectado com {{botName}}',
    'isConnected': 'Já estou conectado ao Discord!',
    'commands': '{{length}} Comandos definidos com sucesso!',
    'token_send': 'Token{{isEncrypted}} sendo enviado para: {{plugin}}',
    'token_not_found': 'Token do Discord está vazio!'
  },
  'error': {
    'unstable': '{{element}} instável',
    'no_found': 'Nenhum {{name}} encontrado',
    'not_exist': '{{name}} não existe!',
    'not_select': 'Nenhuma opção selecionada!',
    'no_possible': 'Não é possivel continuar!',
    'undefined': '{{element}} indefinido!',
    'invalid': '{{element}} invalido!',
    'no_reply': 'Formulário não respondido!',
    'expired': '{{element}} expirado!',
    'disabled': '{{element}} desabilitado!',
    'an_error_occurred': 'Ocorreu um erro: {{element}}',
    'timeout': 'Timeout de {{time}} segundos... tentando após o timeout',
    'login': 'Erro "{{error}}" ao tentar logar',
    'incorrect_value': 'O valor fornecido está incorreto: {{value}}'
  },
  'license': {
    'accept': 'Você concorda com os termos apresentados acima?'
  },
  'plugins': {
    'new': 'Novo plugin adicionado!',
    'starting': 'Iniciando Plugin {{name}}',
    'disconnect': 'Plugin Desconectado: {{name}}',
    'commands': 'Comandos: {{length}}',
    'components': 'Componentes: {{length}}',
    'events': 'Eventos: {{length}}',
    'configs': 'Configurações: {{length}}',
    'crons': 'Crons: {{length}}',
    'entry_load': 'Carregando entry: {{name}}',
    'hasLoaded': 'Plugin adicionado após o primeiro registro — pode ser necessário expulsar o bot e adicioná-lo novamente ao servidor.',
    'devlop': 'Modo de desenvolvimento',
    'last_plugin': 'Último plugin carregado ({{current}}/{{total}})',
    'valid': 'Plugin Valido!',
    'duplicate': 'Plugin {{name}} está duplicado!',
    'invalid_file': 'Arquivo invalido: {{fileName}}',
    'invalid_signature': 'Falha na verificação da assinatura: {{fileName}}',
    'reject': 'O Plugin {{filePath}} saiu com código de erro {{code}} e sinal {{signal}}'
  }
} as const
