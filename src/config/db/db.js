/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
const mongoose = require('mongoose')
require("dotenv").config(); 

mongoose.set('strictQuery', true);
module.exports = async () => {
  try {
    const connectionParams = {
      useNewUrlParser: true,
      useUnifiedTopology:true,
      // useCreateIndex: true
    };
    await mongoose.connect(process.env.MONGODB_URL, connectionParams);
    console.log("connected to Database...");
  } catch (err) {
    console.error("Database connect error", err)
  }

}