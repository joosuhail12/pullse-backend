const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const DefaultFields = {
	archiveAt: {
		type: Date,
	},
	deletedAt: {
			type: Date
	}
};

const DefaultOptions = {
	timestamps: true,
};

class ModelProvider {
	getModel(schemaObj = {}) {
		let existingModels = mongoose.modelNames();
		if (existingModels.includes(schemaObj.schemaName)) {
			return mongoose.model(schemaObj.schemaName);
		}
		let _schema = mongoose.Schema({...DefaultFields, ...schemaObj.fields, }, {...DefaultOptions, ...schemaObj.options, });
		let indexes = schemaObj.indexes || [];
		indexes.forEach(index => {
			// console.log("Creating index for ", schemaObj.schemaName, index.fields, index.options);

			_schema.index(index.fields, index.options);
		});
		_schema.plugin(mongoosePaginate);
		let model = mongoose.model(schemaObj.schemaName, _schema)
		model.on('index', (err) => {
			console.log(err);
			console.log("Indexing");
		});
		model.ensureIndexes();
		return model;
	}
}

module.exports = new ModelProvider();