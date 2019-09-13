"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const redis = require("redis");
const DbContext_1 = require("./DbContext");
const Incrementor_1 = require("./model/Incrementor");
const MARGIN = 100;
class IncrementorService {
    constructor(opts) {
        this.redisClient = null;
        this.dbContext = null;
        this.dbFunc = null;
        this.entity = null;
        this.entity = opts.entity;
        this.setupRedis(opts);
        this.setupDbContext(opts);
    }
    setupRedis(opts) {
        if (opts.redisClient) {
            this.redisClient = opts.redisClient;
        }
        else if (opts.redisOpts) {
            this.redisClient = redis.createClient(opts.redisOpts);
        }
        else {
            throw 'Redis Client Not Found';
        }
    }
    setupDbContext(opts) {
        if (opts.dbContext) {
            this.dbContext = opts.dbContext;
        }
        else if (opts.dbConfig) {
            this.dbContext = new DbContext_1.default(opts.dbConfig);
        }
        else if (opts.dbFunc) {
            this.dbFunc = opts.dbFunc;
        }
        else {
            throw 'DB Context Not Found';
        }
    }
    getKey(appId) {
        let valKey = `INCR-${this.entity}-${appId}`;
        return valKey;
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
        let context = this.dbContext ? this.dbContext : await this.dbFunc(appId);
        let incr = await context.incrementors.where(a => {
            return a.appId.eq(appId).and(a.entity.eq(that.entity));
        }).unique();
        if (incr == null) {
            incr = new Incrementor_1.default();
            incr.entity.set(that.entity);
            incr.appId.set(appId);
            incr.val.set(0);
            incr = await context.incrementors.insert(incr);
        }
        return incr;
    }
    async addIncrements(appId, incr) {
        let oldVal = incr.val.get();
        let newVal = oldVal + MARGIN;
        incr.val.set(newVal);
        let context = this.dbContext ? this.dbContext : await this.dbFunc(appId);
        await context.incrementors.update(incr);
        let valKey = this.getKey(appId);
        for (let i = oldVal; i < newVal; i++) {
            this.redisClient.rpush(valKey, i.toString());
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
                await this.addIncrements(appId, incr);
                let valKey = this.getKey(appId);
                let resStr = await this.getFromRedis(valKey);
                result = Number.parseInt(resStr);
            }
        }
        catch (err) {
            console.error(err);
        }
        return result;
    }
}
exports.default = IncrementorService;
