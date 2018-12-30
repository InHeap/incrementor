"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const DbContext_1 = require("./DbContext");
const Incrementor_1 = require("./model/Incrementor");
const MARGIN = 100;
class IncrementorService {
    constructor(entity, config) {
        this.redisClient = null;
        this.dbContext = null;
        this.entity = null;
        this.entity = entity;
        this.setupRedis(config);
        this.setupDbContext(config);
    }
    setupRedis(config) {
        if (config.redisClient) {
            this.redisClient = config.redisClient;
        }
        else if (config.redisOpts) {
            this.redisClient = redis.createClient(config.redisOpts);
        }
        else {
            throw 'Redis Client Not Found';
        }
    }
    setupDbContext(config) {
        if (config.dbContext) {
            this.dbContext = config.dbContext;
        }
        else if (config.dbConfig) {
            this.dbContext = new DbContext_1.default(config.dbConfig);
        }
        else {
            throw 'DB Context Not Found';
        }
    }
    async getFromRedis(valKey) {
        let that = this;
        return await new Promise((res, rej) => {
            that.redisClient.lpop(valKey, (err, data) => {
                if (err)
                    rej(err);
                res(data);
            });
        });
    }
    async getEntity(appId) {
        let that = this;
        let incr = await this.dbContext.incrementors.where(a => {
            return a.appId.eq(appId).and(a.entity.eq(that.entity));
        }).unique();
        if (incr == null) {
            incr = new Incrementor_1.default();
            incr.entity.set(that.entity);
            incr.appId.set(appId);
            incr.val.set(0);
            incr = await this.dbContext.incrementors.insert(incr);
        }
        return incr;
    }
    async addIncrements(key, incr) {
        let oldVal = incr.val.get();
        let newVal = oldVal + MARGIN;
        incr.val.set(newVal);
        await this.dbContext.incrementors.update(incr);
        for (let i = oldVal; i < newVal; i++) {
            this.redisClient.rpush(key, i);
        }
    }
    async get(appId) {
        let valKey = `INCR-${this.entity}-${appId}`;
        let result = null;
        try {
            let resStr = await this.getFromRedis(valKey);
            if (resStr) {
                result = Number.parseInt(resStr);
            }
            else {
                let incr = await this.getEntity(appId);
                await this.addIncrements(valKey, incr);
                let resStr = await this.getFromRedis(valKey);
                result = Number.parseInt(resStr);
            }
        }
        catch (err) {
            console.error(err);
        }
        return `${result}`;
    }
}
exports.default = IncrementorService;
