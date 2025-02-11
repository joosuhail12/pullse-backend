const _ = require("lodash");
const Model = require("../model");
const errors = require("../../errors");
const { v4: uuid } = require('uuid');

class BaseUtility {

  constructor(schemaObj) {
    this.schemaObj = schemaObj;
    this.populateFields = {};
  }

  async getModel() {
    this.model = await Model.getModel(this.schemaObj);
  }

  async exists(conditions = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };
      let result = await this.model.exists(conditions);
      return result;
    } catch (e) {
      console.log(`Error in exists() while fetching data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async findOne(conditions = {}, projection = [], options = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };

      projection = (!_.isEmpty(projection)) ? projection : { "_id": 0, "__v": 0 };
      let result = await this.model.findOne(conditions, projection, options).lean();
      return result;
    } catch (e) {
      console.log(`Error in findOne() while fetching data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async find(conditions = {}, projection = {}, options = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deleted_at = { $exists: false };

      if (options && (!options.sort || !Object.keys(options.sort).length)) {
        options.sort = { createdAt: -1 };
      }

      projection = (!_.isEmpty(projection)) ? projection : { "_id": 0, "__v": 0 };
      let result = await this.model.find(conditions, projection, options).lean();
      return result;
    } catch (e) {
      console.log(`Error in find() while fetching data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async paginate(conditions = {}, projection = [], options = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };

      if (options && (!options.sort || !Object.keys(options.sort).length)) {
        options.sort = { createdAt: -1 };
      }
      projection = (!_.isEmpty(projection)) ? projection : { "_id": 0, "__v": 0 };
      options.select = projection;
      options.leanWithId = true;
      // options.lean = true;
      let result = await this.model.paginate(conditions, options);
      console.log(result)
      return result;
    } catch (e) {
      console.log(`Error in paginate() while fetching data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async countDocuments(conditions = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };

      let count = await this.model.countDocuments(conditions);
      return count;
    } catch (e) {
      console.log(`Error in find() while fetching data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async insert(record = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }

      if (_.isEmpty(record.id)) {
        record.id = uuid();
      }

      let result = await this.model.create(record);
      return result;
    } catch (e) {

      if (e.code === 11000) {
        return Promise.reject(new errors.Conflict(e.errmsg));
      }
      console.log(`Error in insert() while inserting data for ${this.schemaObj.schemaName} :: ${e}`);
      return Promise.reject(new errors.DBError(e.errmsg));
    }
  }

  async insertMany(recordsToInsert = []) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      let result = await this.model.insertMany(recordsToInsert);
      return result;
    } catch (e) {
      if (e.code === 11000) {
        return Promise.reject(new errors.Conflict(e.errmsg));
      }
      console.log(`Error in insertMany() while inserting data for ${this.schemaObj.schemaName} :: ${e}`);
      return Promise.reject(new errors.DBError(e.errmsg));
    }
  }

  async updateMany(conditions = {}, updatedDoc = {}, options = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };

      let result = await this.model.updateMany(conditions, updatedDoc, options);
      return result;
    } catch (e) {

      if (e.code === 11000) {
        return Promise.reject(new errors.Conflict(e.errmsg));
      }
      console.log(`Error in updateMany() while updating data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async updateOne(conditions = {}, updatedDoc = {}, options = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };

      let result = await this.model.updateOne(conditions, updatedDoc, options);
      return result;
    } catch (e) {

      if (e.code === 11000) {
        return Promise.reject(new errors.Conflict(e.errmsg));
      }
      console.log(`Error in updateOne() while updating data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async findOneAndUpdate(conditions = {}, updatedDoc = {}, options = {}) {
    try {
      let entity = await this.findOne(conditions, null, options)
      if (!entity) {
        return Promise.reject(new errors.NotFound());
      }
      conditions.deletedAt = { $exists: false };
      options.new = true;
      let result = await this.model.findOneAndUpdate(conditions, updatedDoc, options).lean();
      return result;
    } catch (e) {

      if (e.code === 11000) {
        return Promise.reject(new errors.Conflict(e.errmsg));
      }
      console.log(`Error in findOneAndUpdate() while updating data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async deleteMany(conditions = {}) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }
      conditions.deletedAt = { $exists: false };

      let result = await this.model.deleteMany(conditions);
      return result;
    } catch (e) {

      if (e.code === 11000) {
        return Promise.reject(new errors.Conflict(e.errmsg));
      }
      console.log(`Error in deleteMany() while deleting data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

  async populate(field, rows = []) {
    if (!this.populateFields[field]) {
      throw new errors.Internal(`populate field config not set for ${field} in ${this.constructor.name}.`)
    }
    if (_.isEmpty(rows)) {
      return rows;
    }
    let isArray = Array.isArray(rows);


    let selectFields = null;
    if (this.populateFields[field].getFields) {
      selectFields = this.populateFields[field].getFields;
    }
    let utilityInst = this.populateFields[field].utility;
    let srcField = this.populateFields[field].field;
    let multiple = this.populateFields[field].multiple;

    if (!isArray) {
      if (!rows[srcField]) {
        return rows;
      }
      let srcFieldVal = rows[srcField];
      if (multiple) {
        rows[field] = await utilityInst.find({ id: { '$in': srcFieldVal } });
      } else {
        rows[field] = await utilityInst.findOne({ id: srcFieldVal });
      }
      return rows;
    }

    let srcFieldValues = [];
    let Rows = [];
    for (let id = 0; id < rows.length; id++) {
      let row = rows[id];
      row[field] = multiple ? [] : {};
      Rows.push(row);
      if (row[srcField]) {
        if (multiple) {
          srcFieldValues = srcFieldValues.concat(row[srcField]);
        } else {
          srcFieldValues.push(row[srcField])
        }
      }
    }
    if (_.isEmpty(srcFieldValues)) {
      return Rows;
    }
    let srcData = await utilityInst.find({ id: { $in: srcFieldValues } }, selectFields);
    if (_.isEmpty(srcData)) {
      return Rows;
    }

    let srcDataMap = {}
    for (let i = 0; i < srcData.length; i++) {
      let id = srcData[i].id;
      if (!srcDataMap[id]) {
        srcDataMap[id] = srcData[i];
      }
    }
    for (let i = 0; i < Rows.length; i++) {
      let row = Rows[i];
      let srcFieldVal = row[srcField];
      if (multiple) {
        row[field] = srcFieldVal.map(val => srcDataMap[val]);
      } else {
        row[field] = srcDataMap[srcFieldVal];
      }
    }
    return Rows;
  }

  async aggregate(options = []) {
    try {
      if (_.isEmpty(this.model)) {
        await this.getModel();
      }

      let result = await this.model.aggregate(options);
      return result;
    } catch (e) {
      console.log(`Error in aggregate() while aggregating data for ${this.schemaObj.schemaName} :: ${e}`);
      throw e;
    }
  }

}

module.exports = BaseUtility;