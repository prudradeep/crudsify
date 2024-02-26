"use strict";

const { Boom } = require("@hapi/boom");

const checkCanAssign = async (groupId, userScope, sequelize) => {
  try {
    let group = await sequelize.models.group.findByPk(groupId, {
      include: { model: sequelize.models.permission },
    });
    for (let permission of group.permissions) {
      // Check if the user scope intersects (contains values of) the assign scope.
      if (
        !userScope.filter(
          (scope) => permission.assignScope.indexOf(scope) > -1
        )[0]
      ) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return Boom.forbidden(err.message);
  }
};

const formatResponse = (canEdit, next) => {
  try {
    if (canEdit.isBoom) return next(canEdit);

    if (canEdit) return next();
    else return next(Boom.forbidden("Higher role required to assign group"));
  } catch (err) {
    return next(err);
  }
};

/**
 * Policy to enforce auth for assigning groups.
 * @param sequelize
 * @param isOwner: True if group is the owner model, false otherwise.
 * @returns {groupAuth}
 */
exports.groupAuth = (sequelize, isOwner) => {
  return async (req, res, next) => {
    try {
      if ((!isOwner && !req.path.includes("group")) || !req.auth) return next();
      let userScope = req.auth.credentials.scope;
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
        const groupIds = (req.body.data ? req.body.data : req.body).map(
          (object) => object.childId || object
        );
        let promises = [];
        groupIds.forEach((groupId) =>
          promises.push(checkCanAssign(groupId, userScope, sequelize))
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
