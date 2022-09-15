const express = require('express')
const cors = require('cors')
const http = require('http')
process.env.DEBUG = '*'
const app = express()
const bodyParser = require('body-parser')
const db = require('./src/config/db/db');
const users = require("./src/routes/users");
const auth = require("./src/routes/auth");

db();

app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors())
app.use(bodyParser.json())
const server = http.createServer(app)
const singleRoutes = require('./src/routes/routes')

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use("/users", users);
app.use("/auth", auth);

app.use("/api", singleRoutes)

server.listen(4000, () => {
  console.log('Server running at http://localhost:4000/')
})