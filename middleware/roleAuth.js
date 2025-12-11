module.exports = function roleAuth(allowedRoles = []) {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Access denied. You do not have permission to perform this action.",
      });
    }

    next();
  };
};
