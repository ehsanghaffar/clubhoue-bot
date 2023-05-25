/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const express = require("express");
const router = express.Router();
const clubService = require("../services/clubApiService");

const pomodoroDuration = 45 * 60;
const breakDuration = 15 * 60;

let counter = 0;

const startTimer = async (channel, emoji, duration, nextTimer) => {
  const timer = setInterval(async () => {
    counter++;
    clubService.debug("counter", counter);

    if (counter === duration) {
      clearInterval(timer);

      if (nextTimer) {
        await nextTimer(channel, emoji);
      }

      const reaction = await clubService.emojiReaction({ channel: channel, emoji: emoji });
      clubService.debug("react", reaction);

      counter = 0;
    }
  }, 1000);

  clubService.debug("timer", timer);
}

const startPomodoroTimer = (channel, emoji) => startTimer(channel, emoji, pomodoroDuration, startBreakTimer);
const startBreakTimer = (channel, emoji) => startTimer(channel, emoji, breakDuration, startPomodoroTimer);

const startBaseTimer = (channel, emoji) => {
  setInterval(() => {
    const date = new Date();
    if (date.getMinutes() === 0) {
      startPomodoroTimer(channel, emoji);
    }
  }, 60 * 60 * 1000); 
}

router.post("/start-timer", (req, res) => {
  const { channel, emoji } = req.body;

  startBaseTimer(channel, emoji);

  res.sendStatus(200);
});

module.exports = router;