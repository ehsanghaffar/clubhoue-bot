const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");


const { Client, profiles } = require("..");

const profile = {
  ...profiles.application.lastVersion,
};



const profileLoc = path.join(__dirname, "../../profile.json");
let ctx = false;

if (fs.existsSync(profileLoc)) {
  ctx = JSON.parse(fs.readFileSync(profileLoc));

  profile.token = ctx.tokens.auth;
  profile.deviceId = ctx.deviceId;
}

const clubService = new Client({ profile });

module.exports = clubService;

