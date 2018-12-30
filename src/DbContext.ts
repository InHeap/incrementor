import * as es from 'es-entity';

import IDbContext from './bean/IDbContext';
import Incrementor from './model/Incrementor';


class DbContext extends es.Context implements IDbContext {
	constructor(config?: es.bean.IConnectionConfig, entityPath?: string) {
		super(config, entityPath);
		this.init();
	}

	incrementors = new es.collection.DBSet<Incrementor>(Incrementor);
}

export default DbContext;
