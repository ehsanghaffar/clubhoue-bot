const mongoose = require('mongoose')

const url = 'mongodb+srv://mongoUser1:MongodbPass@cluster0.rnytx.mongodb.net/?retryWrites=true&w=majority'

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