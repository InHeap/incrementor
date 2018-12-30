import * as es from 'es-entity';
import * as redis from 'redis';

import IDbContext from './IDbContext';

interface IConfig {
	dbContext?: IDbContext;
	dbConfig?: es.bean.IConnectionConfig;
	redisOpts?: redis.ClientOpts;
	redisClient?: redis.RedisClient;
}

export default IConfig;
