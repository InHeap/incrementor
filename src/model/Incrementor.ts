import { types } from 'es-entity';

export default class Incrementor {
	id = new types.Number();
	crtdDt = new types.Date();
	uptdDt = new types.Date();

	entity = new types.String();
	appId = new types.Number();

	val = new types.Number();
}
