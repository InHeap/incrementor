import * as redis from 'redis';

import IOptions from './bean/IOptions';
import IDbContext from './bean/IDbContext';
import DbContext from './DbContext';
import IncrementorModel from './model/Incrementor';

const MARGIN = 100;

export default class IncrementorService {

	redisClient: redis.RedisClient = null;
	dbContext: IDbContext = null;
	dbFunc: (appId: number) => Promise<IDbContext> = null;
	entity: string = null;

	constructor(opts: IOptions) {
		this.entity = opts.entity;

		this.setupRedis(opts);
		this.setupDbContext(opts);
	}

	setupRedis(opts: IOptions) {
		if (opts.redisClient) {
			this.redisClient = opts.redisClient;
		} else if (opts.redisOpts) {
			this.redisClient = redis.createClient(opts.redisOpts);
		} else {
			throw 'Redis Client Not Found';
		}
	}

	setupDbContext(opts: IOptions) {
		if (opts.dbContext) {
			this.dbContext = opts.dbContext;
		} else if (opts.dbConfig) {
			this.dbContext = new DbContext(opts.dbConfig);
		} else if (opts.dbFunc) {
			this.dbFunc = opts.dbFunc;
		} else {
			throw 'DB Context Not Found';
		}
	}

	getKey(appId: number) {
		let valKey = `INCR-${this.entity}-${appId}`;
		return valKey;
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
		let context = this.dbContext ? this.dbContext : await this.dbFunc(appId);
		let incr = await context.incrementors.where(a => {
			return a.appId.eq(appId).and(a.entity.eq(that.entity));
		}).unique();

		if (incr == null) {
			// Create new entry for this app
			incr = new IncrementorModel();
			incr.entity.set(that.entity);
			incr.appId.set(appId);

			incr.val.set(0);
			incr = await context.incrementors.insert(incr);
		}
		return incr;
	}

	private async	addIncrements(appId: number, incr: IncrementorModel) {
		let oldVal = incr.val.get();
		let newVal = oldVal + MARGIN;

		incr.val.set(newVal);
		let context = this.dbContext ? this.dbContext : await this.dbFunc(appId);
		await context.incrementors.update(incr);

		let valKey = this.getKey(appId);
		for (let i = oldVal; i < newVal; i++) {
			this.redisClient.rpush(valKey, i);
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

				await this.addIncrements(appId, incr);

				let valKey = this.getKey(appId);
				let resStr = await this.getFromRedis(valKey);
				result = Number.parseInt(resStr);
			}

		} catch (err) {
			console.error(err);
		}
		return `${result}`;
	}

}