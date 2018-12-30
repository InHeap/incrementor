"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const es = require("es-entity");
const Incrementor_1 = require("./model/Incrementor");
class DbContext extends es.Context {
    constructor(config, entityPath) {
        super(config, entityPath);
        this.incrementors = new es.collection.DBSet(Incrementor_1.default);
        this.init();
    }
}
exports.default = DbContext;
