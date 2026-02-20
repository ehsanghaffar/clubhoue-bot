const clubService = require("../services/clubApiService");
const fetchMessages = async (channel) => {
  try {
    const result = await clubService.getChannelMessages({ channel: channel, order: 0 })
    return result
  } catch (error) {
    console.log(error);
  }
};

module.exports = fetchMessages