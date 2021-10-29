'use strict';

const generate = require('./src/generate');
const highlight = require('./src/highlight')

exports.activate = async () => {
    generate();
    highlight();
};
