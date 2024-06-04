const Promise = require("bluebird");
const config = require('../config')
const errors = require("../errors");

// var fs = require('fs');
var Papa = require('papaparse');
const BaseFileSystem = require("./BaseFileSystem");

class CSVFileSystem extends BaseFileSystem {

  constructor() {
    super();
    this.rows = [];
  }

  rowCb(row) {
    this.rows.push(row);
  }

  async getData(filepath, cb=null) {
    if (!cb) {
      cb = this.rowCb.bind(this);
    }
    this.rows = [];
    // var content = fs.readFileSync(filepath, "utf8");
    console.log({filepath});
    let content = await this.getFileContent(filepath);
    let self = this;
    let rows = await Papa.parse(content, {
      header: true,
      worker: true,
      step: function(results) {
        cb(results.data)
      },
      // complete: (results) => {
      //   this.rows = results.data;
      // }
    });
    return rows;
  }

}

module.exports = CSVFileSystem;

// let inst = new CSVFileSystem();
// let file = "./template/UserData.csv";


// inst.getData(file).then(() => {console.log(inst.rows)})