'use strict'

const Boom = require('@hapi/boom')
const _ = require('lodash')
const configStore = require("../config");

const addMeta = (action, req, next) => {
    try {
        let metaType = ''
        switch (action) {
            case 'create':
                metaType = 'createdBy'
                break;
            case 'update':
                metaType = 'updatedBy'
                break;
            case 'delete':
                metaType = 'deletedBy'
                break;
            default:
                throw new Error('Invalid action.')
        }

        const userId = req.auth.credentials.user[configStore.get('/dbPrimaryKey')]
        if (!userId) {
            const message = 'User id not found in auth credentials. Please specify the user id path in "config.dbPrimaryKey"'
            throw Boom.badRequest(message)
        }

        if (_.isArray(req.body)) {
            req.body.forEach(function (document) {
                document[metaType] = userId
            })
        } else {
            req.body = req.body || {}
            req.body[metaType] = userId
        }
        return next()
    } catch (err) {
        return next(Boom.badImplementation(err))
    }
}

exports.createdByMiddleware = (req, res, next) => {
    return addMeta('create', req, next)
}

exports.updatedByMiddleware = (req, res, next) => {
    return addMeta('update', req, next)
}

exports.deletedByMiddleware = (req, res, next) => {
    return addMeta('delete', req, next)
}