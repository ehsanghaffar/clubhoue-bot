const mongoose = require('mongoose')

const url = 'mongodb://localhost:27020/test'
// const url = process.env.DB

module.exports = async () => {

  try {
    const connectionParams = {
      useNewUrlParser: true,
      useUnifiedTopology:true,
      // useCreateIndex: true
    };
    await mongoose.connect(url, connectionParams);
    console.log("connected to Database...");
  } catch (err) {
    console.error("Database connect error", err)
  }

}