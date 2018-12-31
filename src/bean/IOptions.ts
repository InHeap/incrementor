import * as es from 'es-entity';
import * as redis from 'redis';

import IDbContext from './IDbContext';

interface IOptions {
	entity: string;
	redisOpts?: redis.ClientOpts;
	redisClient?: redis.RedisClient;
	dbContext?: IDbContext;
	dbConfig?: es.bean.IConnectionConfig;
	dbFunc?: (appId: number) => Promise<IDbContext>;
}

export default IOptions;
