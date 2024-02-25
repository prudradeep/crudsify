'use strict'
const { Logger } = require("../helpers/logger");

exports.sendResponse = ({ data, status, res, next, json }) => {
    if (!res)
        return next(new Error('Required res parameter missing in response helper.'))

    if(!next)
        Logger.error('Required next parameter missing in response helper.')

    status = status ? status : 200

    if (!data && !json)
        res.sendStatus(status)
    else if (json)
        res.status(status).send(json)
    else
        res.status(status).send(data)
    next()
}