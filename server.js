const express = require('express')
const cors = require('cors')
const http = require('http')
require('dotenv').config();
process.env.DEBUG = '*'
const app = express()
const bodyParser = require('body-parser')
const db = require('./src/config/db/db');
// const users = require("./src/routes/users");
// const auth = require("./src/routes/auth");
const singleRoutes = require('./src/routes/routes')
const chatbotRoutes = require('./src/routes/chatbot.routes')
const pomodoroRoutes = require('./src/routes/channel.routes');
const { errorHandler } = require('./src/middlewares/auth');
const port = process.env.PORT || 4000


db();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(bodyParser.json())
const server = http.createServer(app)


app.get('/', (req, res) => {
  res.send('Hello World!')
})

// app.use("/users", users);
// app.use("/auth", auth);

app.use("/api", singleRoutes)
app.use("/chat", chatbotRoutes)
app.use("/pomo", pomodoroRoutes)

// middlewares
app.use(errorHandler)

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
