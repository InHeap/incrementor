"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const es_entity_1 = require("es-entity");
class Incrementor {
    constructor() {
        this.id = new es_entity_1.types.Number();
        this.crtdDt = new es_entity_1.types.Date();
        this.uptdDt = new es_entity_1.types.Date();
        this.entity = new es_entity_1.types.String();
        this.appId = new es_entity_1.types.Number();
        this.val = new es_entity_1.types.Number();
    }
}
exports.default = Incrementor;
