const mongoose = require('mongoose')
require("dotenv").config(); 

const url = 'mongodb://localhost:27017/test'
// const url = process.env.DB
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