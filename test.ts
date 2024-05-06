import { io } from "socket.io-client"

const socket = io("ws://localhost:3000/")

socket.on('teste', (mensagem: string) => {
    console.log(mensagem)
})

socket.emit('Teste', 'isuhaidh')