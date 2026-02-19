/**
 * @license
 * @copyright Ehsan Gi.
 * Licensed under the MIT License. See LICENSE in the project root for license information.
 * @author Ehsan Ghaffar <ghafari.5000@gmail.com>
 */
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


// error handler middlware
module.exports.errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ error: err.message || "An unexpected error occurred." });
};