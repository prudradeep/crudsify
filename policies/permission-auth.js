"use strict";

const { Boom } = require("@hapi/boom");

const checkCanAssign = async (permissionId, userScope, sequelize) => {
  try {
    let result = await sequelize.models.permission.findByPk(permissionId);
    let assignScope = result.assignScope;
    // Check if the user scope intersects (contains values of) the assign scope.
    let canAssign = !!userScope.filter(
      (scope) => assignScope.indexOf(scope) > -1
    )[0];
    return canAssign;
  } catch (err) {
    return Boom.forbidden(err.message);
  }
};

const formatResponse = (canEdit, next) => {
  try {
    if (canEdit.isBoom) return next(canEdit);

    if (canEdit) return next();
    else
      return next(Boom.forbidden("Higher role required to assign permission"));
  } catch (err) {
    return next(err);
  }
};

/**
 * Policy to enforce auth for assigning permissions.
 * @param sequelize
 * @param isOwner: True if permission is the owner model, false otherwise.
 * @returns {permissionAuth}
 */
exports.permissionAuth = (sequelize, isOwner) => {
  return async (req, res, next) => {
    try {
      if ((!isOwner && !req.path.includes("permission")) || !req.auth)
        return next();

      let userScope = req.auth.credentials.scope;
      // Always allow root
      if (userScope.indexOf("root") > -1) return next();

      if (isOwner) {
        let canAssign = await checkCanAssign(
          req.params.ownerId,
          userScope,
          sequelize
        );
        return formatResponse(canAssign, next);
      } else if (req.params.childId) {
        let canAssign = await checkCanAssign(
          req.params.childId,
          userScope,
          sequelize
        );
        return formatResponse(canAssign, next);
      } else {
        const permissionIds = (req.body.data ? req.body.data : req.body).map(
          (object) => object.childId || object
        );
        let promises = [];
        permissionIds.forEach((permissionId) =>
          promises.push(checkCanAssign(permissionId, userScope, sequelize))
        );

        let result = await Promise.all(promises);
        // If any of the checks fail, then an error is returned
        let canAssign =
          result.filter((canAssign) => canAssign === false)[0] === undefined;

        return formatResponse(canAssign, next);
      }
    } catch (err) {
      next(err);
    }
  };
};
