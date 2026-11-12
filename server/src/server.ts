import express from "express"
import http from "http"
import { Server } from "socket.io"

const app = express()
const server = http.createServer(app)

app.get("/", (req, res) => res.send("END TO END ENCRYPTED"))

const io = new Server(server, { cors: { origin: ["http://localhost:5173"] } })

io.on("connection", (socket) => {

  console.log(`User connected with socketId ${socket.id} \n`)

  socket.on("message", e => {
    console.log(e, "\n")
    socket.broadcast.emit("receive", e)
  })


  socket.on("key", e => {
    console.log(e)
    if (e.username == "user1" || e.username == "user2") {
      socket.broadcast.emit("receiveKey", { publicKey: e.publicKey })
    }
  })

})


const port = 3000
server.listen(port, () => console.log(`Server running on ${port} \n\n`))
