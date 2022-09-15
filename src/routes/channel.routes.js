const { User, validate } = require("../models/user");
const auth = require("../middlewares/auth")
const bcrypt = require("bcrypt")
const express = require("express")
const router = express.Router()

