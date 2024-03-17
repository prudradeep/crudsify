"use strict";

const Boom = require("@hapi/boom");
const configStore = require("crudsify/config");
const { ucfirst } = require("crudsify/utils");

const checkCanEdit = async (userId, req, sequelize) => {
  try {
    let user = await sequelize.models.user.findByPk(userId, {
      include: { model: sequelize.models.role },
    });

    const currentUserRank = req.auth.credentials.user.role.rank;
    const affectedUserRank = user.role.rank;
    return currentUserRank < affectedUserRank;
  } catch (err) {
    return Boom.forbidden(err.message);
  }
};

const formatResponse = (canEdit, next) => {
  try {
    if (canEdit.isBoom) return next(canEdit);

    if (canEdit) return next();
    else return next(Boom.forbidden("Can only update users with a lower role"));
  } catch (err) {
    return next(err);
  }
};

/**
 * Policy to enforce role rank. A user should only be able to update users that have a role with a lower rank.
 * @param sequelize: The sequelize object
 * @param userIdParam: The url parameter that contains the id of the user to be affected. Should be "child" if the user is a child association.
 * @returns {rankAuth}
 */
exports.rankAuth = function (sequelize, userIdParam) {
  return async (req, res, next) => {
    try {
      if (!req.path.includes("user") || !req.auth) return next();

      if (userIdParam === "child") {
        if (req.params.childId) {
          let canEdit = await checkCanEdit(
            req.params.childId,
            req,
            sequelize,
            next
          );
          return formatResponse(canEdit, next);
        } else {
          const userIds = (req.body.data ? req.body.data : req.body).map(
            (object) => object.childId || object
          );
          let promises = [];
          userIds.forEach((userId) =>
            promises.push(checkCanEdit(userId, req, sequelize, next))
          );

          let result = await Promise.all(promises);
          // If any of the checks fail, then an error is returned
          let canEdit =
            result.filter((canEdit) => canEdit === false)[0] === undefined;

          return formatResponse(canEdit, next);
        }
      } else {
        let canEdit = await checkCanEdit(
          req.params[userIdParam],
          req,
          sequelize,
          next
        );
        return formatResponse(canEdit, next);
      }
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Policy to restrict users from promoting other users to a rank higher than their own.
 * @returns {promoteAuth}
 */
exports.promoteAuth = function (sequelize) {
  return async (req, res, next) => {
    try {
      if (!req.auth) return next();
      if (req.body[`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]) {
        let role = await sequelize.models.role.findByPk(
          req.body[`role${ucfirst(configStore.get("/dbPrimaryKey").name)}`]
        );
        let updatedRank = role.rank;
        let currentRank = req.auth.credentials.user.role.rank;

        if (updatedRank < currentRank)
          throw Boom.forbidden(
            "Can't promote user to a higher role than yours"
          );
        else return next();
      }
    } catch (err) {
      next(err);
    }
  };
};
