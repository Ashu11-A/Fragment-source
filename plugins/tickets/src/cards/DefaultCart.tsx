import { JSX, Builder, Font, FontFactory } from 'canvacord'

interface Props {
    title: string,
    description: string,
}

export class DefaultTicketCart extends Builder<Props> {
  constructor () {
    super(800, 421)

    if (!FontFactory.size) Font.loadDefault();

    this.bootstrap({
      title: '',
      description: ''
    })
  }

  setTitle(value: string) { this.options.set('title', value); return this }
  setDescription(value: string) { this.options.set('description', value); return this }

  async render() {
    // const { title, description } = this.options.getOptions()

    return (
      <div className="flex flex-col w-full h-full py-8 px-8 items-center justify-center bg-[#23272A]">
        <div className="flex flex-col w-full h-full bg-gray-50 rounded-2xl">
          <div className="flex flex-row items-center h-8 w-full bg-black rounded-t-xl">
            <div className="flex flex-row pl-1 items-center">
              <div className="flex mx-1.5 w-5 h-5 rounded-full bg-red-500"></div>
              <div className="flex mx-1.5 w-5 h-5 rounded-full bg-yellow-500"></div>
              <div className="flex mx-1.5 w-5 h-5 rounded-full bg-green-500"></div>
            </div>
            <div className="flex w-full h-full items-center">
              <h3 className="text-white text-center">SeventyHost</h3>
            </div>
          </div>
          <div className="flex flex-col w-full h-full px-6">
            <h1 className="flex flex-col text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 text-left">
              <span>Precisa de suporte?</span>
              <span className="text-indigo-600">Está no lugar certo!</span>
            </h1>
            <h2 className="flex flex-col text-justify">
          Bem-vindo ao nosso serviço de atendimento de tickets!
          Aqui, estamos prontos para resolver seus problemas e responder suas dúvidas.
          Conte conosco para uma experiência tranquila e satisfatória.
          Estamos aqui para ajudar a qualquer hora.
            </h2>
          </div>
        </div>
      </div>
    )
  }
}