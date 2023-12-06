'use strict'

import generate from "./generate"
import highlight from './highlight'
import genSynopsisForTestFlows from './generate-synopsis-header-for-test-flows'

export function activate(ctx) {
    console.log(`GEN`);
    generate()
    highlight(ctx)
    genSynopsisForTestFlows(ctx)
}
