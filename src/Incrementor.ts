import * as redis from 'redis';

import IConfig from './bean/IConfig';
import IDbContext from './bean/IDbContext';
import DbContext from './DbContext';
import IncrementorModel from './model/Incrementor';

const MARGIN = 100;

export default class IncrementorService {

	redisClient: redis.RedisClient = null;
	dbContext: IDbContext = null;
	entity: string = null;

	constructor(entity: string, config: IConfig) {
		this.entity = entity;

		this.setupRedis(config);
		this.setupDbContext(config);
	}

	setupRedis(config: IConfig) {
		if (config.redisClient) {
			this.redisClient = config.redisClient;
		} else if (config.redisOpts) {
			this.redisClient = redis.createClient(config.redisOpts);
		} else {
			throw 'Redis Client Not Found';
		}
	}

	setupDbContext(config: IConfig) {
		if (config.dbContext) {
			this.dbContext = config.dbContext;
		} else if (config.dbConfig) {
			this.dbContext = new DbContext(config.dbConfig);
		} else {
			throw 'DB Context Not Found';
		}
	}

	private async	getFromRedis(valKey: string) {
		let that = this;

		return await new Promise<string>((res, rej) => {
			that.redisClient.lpop(valKey, (err, data) => {
				if (err) rej(err);
				res(data);
			});
		});
	}

	private async	getEntity(appId: number) {
		let that = this;
		let incr = await this.dbContext.incrementors.where(a => {
			return a.appId.eq(appId).and(a.entity.eq(that.entity));
		}).unique();

		if (incr == null) {
			// Create new entry for this app
			incr = new IncrementorModel();
			incr.entity.set(that.entity);
			incr.appId.set(appId);

			incr.val.set(0);
			incr = await this.dbContext.incrementors.insert(incr);
		}
		return incr;
	}

	private async	addIncrements(key: string, incr: IncrementorModel) {
		let oldVal = incr.val.get();
		let newVal = oldVal + MARGIN;

		incr.val.set(newVal);
		await this.dbContext.incrementors.update(incr);

		for (let i = oldVal; i < newVal; i++) {
			this.redisClient.rpush(key, i);
		}
	}

	async get(appId: number) {
		let valKey = `INCR-${this.entity}-${appId}`;

		let result: number = null;
		try {
			let resStr = await this.getFromRedis(valKey);
			if (resStr) {
				result = Number.parseInt(resStr);
			} else {
				// Loaded vals are finished. Increment counter buffer
				let incr = await this.getEntity(appId);

				await this.addIncrements(valKey, incr);

				let resStr = await this.getFromRedis(valKey);
				result = Number.parseInt(resStr);
			}

		} catch (err) {
			console.error(err);
		}
		return `${result}`;
	}

}