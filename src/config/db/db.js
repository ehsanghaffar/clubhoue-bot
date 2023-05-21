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