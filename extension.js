'use strict'

const generate = require('./src/generate')
const highlight = require('./src/highlight')
const genSynopsisForTestFlows = require('./src/generate-synopsis-header-for-test-flows')

exports.activate = async (ctx) => {
    generate()
    highlight(ctx)
    console.log(`AZ`)
    genSynopsisForTestFlows(ctx)
    console.log(`VZ`)
}
