export default {
  'authenticate': {
    'select_bot': 'Select your bot',
    'choose_option': 'How do you want to proceed?',
    'registered': 'Registered at:',
    'hello': 'Hello {{name}}',
    'change_token': 'Change Token',
    'try_again': 'Try Again',
    'logout': 'Logout',
    'create_bot': 'Create a new bot',
    'no_bots': 'You don\'t have any bots registered',
    'bot_name': 'Enter the bot name'
  },
  'commands': {
    'lang': {
      'sucess': 'Language changed successfully!',
      'error': 'Unable to change the bot\'s language!'
    }
  },
  'crypt': {
    'encrypted': 'encrypted',
    'your_password': 'Your Password:'
  },
  'database': {
    'starting': 'Starting Database',
    'initialized': 'Database initialized with {{length}} entries',
    'invalid_entity': '{{tableName}} Invalid entity, loaded entities:'
  },
  'discord': {
    'start': 'Starting Discord',
    'create': 'Creating the Discord client',
    'close': 'Destroying connection with Discord',
    'connected': 'Connected with {{botName}}',
    'isConnected': 'Already connected to Discord!',
    'commands': '{{length}} Commands successfully defined!',
    'token_send': 'Token{{isEncrypted}} being sent to: {{plugin}}',
    'token_not_found': 'Discord token is empty!'
  },
  'error': {
    'unstable': '{{element}} unstable',
    'no_found': 'No {{name}} found',
    'not_exist': '{{name}} does not exist!',
    'not_select': 'No option selected!',
    'no_possible': 'It is not possible to continue!',
    'undefined': '{{element}} undefined!',
    'invalid': '{{element}} invalid!',
    'no_reply': 'Form not replied!',
    'expired': '{{element}} expired!',
    'disabled': '{{element}} disabled!',
    'an_error_occurred': 'An error occurred: {{element}}',
    'timeout': 'Timeout of {{time}} seconds... trying after the timeout',
    'login': 'Error "{{error}}" when trying to log in',
    'incorrect_value': 'Value provided is incorrect: {{value}}'
  },
  'license': {
    'accept': 'Do you agree with the terms presented above?'
  },
  'plugins': {
    'new': 'New plugin added!',
    'starting': 'Starting Plugin {{name}}',
    'disconnect': 'Plugin Disconnected: {{name}}',
    'commands': 'Commands: {{length}}',
    'components': 'Components: {{length}}',
    'events': 'Events: {{length}}',
    'configs': 'Configs: {{length}}',
    'crons': 'Crons: {{length}}',
    'entry_load': 'Loading entry: {{name}}',
    'hasLoaded': 'Plugin added after first registration — removing and re-adding the bot to the server may be required.',
    'devlop': 'Development mode',
    'last_plugin': 'Last plugin loaded ({{current}}/{{total}})',
    'valid': 'Valid Plugin!',
    'duplicate': 'Plugin {{name}} is duplicated!',
    'invalid_file': 'Invalid file: {{fileName}}',
    'invalid_signature': 'Signature verification failed: {{fileName}}',
    'reject': 'Plugin {{filePath}} exited with error code {{code}} and signal {{signal}}'
  }
} as const
