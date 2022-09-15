const jwt = require("jsonwebtoken");

const jwtPrivateKey = 'secretkey'

module.exports = (req, res, next) => {
    try {
        const token = req.header("x-auth-token");
        if (!token) return res.status(403).send("Access denied.");

        // const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const decoded = jwt.verify(token, jwtPrivateKey)
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).send("Invalid token");
    }
};
// TODO: Improve performance