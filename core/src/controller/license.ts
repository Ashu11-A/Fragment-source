import { i18 } from '@/controller/lang.js'
import { RootPATH } from '@/index.js'
import { existsSync } from 'fs'
import { watch } from 'fs'
import { readFile, writeFile } from 'fs/promises'
import { marked, Renderer } from 'marked'
import TerminalRenderer from 'marked-terminal'
import { join } from 'path'
import prompt from 'prompts'

const license = `
\`\`\`
Copyright © Ashu11-A. <Matheusn.biolowons@gmail.com> and contributors
\`\`\`


Este software, um bot para a plataforma Discord, é fornecido por [Ashu11-A](https://github.com/Ashu11-A) (Desenvolvedor) e seus mantenedores no estado em que se encontra, sem garantias de qualquer tipo, expressas ou implícitas. O Desenvolvedor não se responsabiliza por quaisquer danos ou problemas decorrentes do uso deste bot.

Você, ao usar este bot, concorda com os seguintes termos:

1. O bot é destinado apenas ao uso na plataforma Discord e em conformidade com os [Termos de Serviço do Discord](https://discord.com/terms).
2. Você reconhece que o Desenvolvedor detém todos os direitos autorais do bot e não tem permissão para remover ou modificar quaisquer avisos de direitos autorais presentes no bot.
3. O Desenvolvedor se reserva o direito de, por meio de meios legais, solicitar a retirada deste bot de qualquer servidor Discord ou plataforma online, caso considere que seu uso está em desacordo com os Termos de Serviço do Discord ou que sua integridade está sendo comprometida.

Esta licença não concede a você direitos adicionais para redistribuir ou sublicenciar este bot. Qualquer uso deste bot está sujeito a esta licença e aos Termos de Serviço do Discord.

O aviso de direitos autorais acima e este aviso de permissão serão incluídos em todas as cópias ou partes substanciais do Software.

- Esta licença está sujeita às leis da \`\`República Federativa do Brasil\`\`, sendo a legislação do \`\`Distrito Federal\`\` responsável pela regulamentação e interpretação de quaisquer disputas ou controvérsias decorrentes deste software, que serão resolvidas de acordo com as normas vigentes nessa jurisdição.

© [Ashu11-A](https://github.com/Ashu11-A)

`

let watched = false

export class License {
  async checker () {
    if (existsSync(`${RootPATH}/.license`)) {
      const data = await readFile(`${RootPATH}/.license`, { encoding: 'utf-8' })
      const accept = /true/i.test(data)
      if (!accept) return await this.ask()
    } else {
      await this.ask()
    }
    if (!watched) {
      watched = true
      const wather = watch(join(RootPATH, '.license'))

      wather.on('change', () => this.checker())
    }
  }

  async ask () {
    marked.setOptions({
      renderer: new TerminalRenderer() as Renderer
    })
    console.log(marked(license))


    const response = await prompt({
      name: 'accept',
      type: 'toggle',
      message: i18('license.accept'),
      initial: false
    })

    switch (response.accept) {
    case true: {
      await writeFile(`${RootPATH}/.license`, 'ACCEPT=true')
      break
    }
    default: {
      await writeFile(`${RootPATH}/.license`, 'ACCEPT=false')
      throw new Error(i18('error.no_possible'))
    }
    }
  }
}