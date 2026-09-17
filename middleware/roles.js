function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.userRecord) {
            return res.status(401).json({
                error: 'Brak autoryzacji.',
            });
        }

        if (!allowedRoles.includes(req.userRecord.role)) {
            return res.status(403).json({
                error: 'Brak wymaganych uprawnień.',
            });
        }

        next();
    };
}

module.exports = {
    requireRole,
};