/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
// Set timer for 45 minutes
let pomodoroTimer = 45 * 60;

// Set break time to 15 minutes
let breakTime = 15 * 60;

// Initialize a counter to keep track of the current time
let counter = 0;

// Create a function to start the timer
function startTimer() {
  // Set an interval to execute every second
  let timer = setInterval(function () {
    // Increment the counter
    counter++;

    // Check if the timer is done
    if (counter == pomodoroTimer) {
      // Stop the timer
      clearInterval(timer);

      // Reset the counter to 0
      counter = 0;

      // Start the break timer
      startBreakTimer();
    }
  }, 1000);
}

// Create a function to start the break timer
function startBreakTimer() {
  // Set an interval to execute every second
  let breakTimer = setInterval(function () {
    // Increment the counter
    counter++;

    // Check if the break timer is done
    if (counter == breakTime) {
      // Stop the break timer
      clearInterval(breakTimer);

      // Call the API

      // Reset the counter to 0
      counter = 0;

      // Start the pomodoro timer
      startTimer();
    }
  }, 1000);
}


// Start the timer every hour at 0 min
// setInterval(function() {
//   const date = new Date();
//   if(date.getMinutes() === 0) { // check if it's the beginning of the hour
//     startTimer();
//   }
// }, 60 * 60 * 1000); // run every hour (6

// Start the timer
module.exports = startTimer