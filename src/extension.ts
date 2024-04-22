'use strict'

import generate from "./generate"
import highlight from './highlight'
import genSynopsisForTestFlows from './generate-synopsis-header-for-test-flows'
import h1 from './h1'
import { gitmojis } from "./gitmojis"

export function activate(ctx) {
    console.log(`INITIATED => if this is not triggered, please check that package.json activationEvents match the opened file`)
    generate()
    highlight(ctx)
    genSynopsisForTestFlows(ctx)
    gitmojis(ctx)
    h1()
}
