const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt; // Assuming you store the JWT in a cookie

  if (!token) {
    return res.redirect('/login'); // Redirect to login if no token is present
  }

  jwt.verify(token, '123', (err, decoded) => {
    if (err) {
      return res.redirect('/login'); // Redirect to login if the token is invalid
    }

    req.user = decoded; // Attach user information to the request object
    console.log('Token verified, user:', decoded);
    next();
  });
};

module.exports = { verifyToken };
