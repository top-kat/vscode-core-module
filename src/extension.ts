'use strict'

import generate from "./generate"
import highlight from './highlight'
import genSynopsisForTestFlows from './generate-synopsis-header-for-test-flows'

export function activate(ctx) {
    console.log(`INITIATED => if this is not triggered, please check that pakage.json activationEvents match the opened file`)
    generate()
    highlight(ctx)
    genSynopsisForTestFlows(ctx)
}
