import * as es from 'es-entity';

import Incrementor from '../model/Incrementor';

interface IDbContext {
	incrementors: es.collection.DBSet<Incrementor>;
}

export default IDbContext;
