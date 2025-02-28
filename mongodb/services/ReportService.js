const Promise = require("bluebird");
const errors = require("../errors");
const ReportUtility = require("../db/utilities/ReportUtility");
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const _ = require("lodash");
const ChartType = require("../constants/ChartType");
// const COLORS = require("../tmp/colors");
const { getAttributeOptions } = require("../Utils/commonUtils");
const { error } = require("winston");

function random_rgba() {
  var o = Math.round, r = Math.random, s = 255;
  return 'rgba(' + o(r()*s) + ',' + o(r()*s) + ',' + o(r()*s) + ',' + r().toFixed(1) + ')';
}

class ReportService extends BaseService {
  constructor() {
    super();
    this.utilityInst = new ReportUtility();
    this.ticketServiceInst = new TicketService();
    this.entityName = "Report";
    this.listingFields = ["id", "name", "description", "-_id"];
    this.updatableFields = ["name", "description", "charts"];
  }

  async validateCharts(charts) {
    charts.forEach(chart => {
      if (chart.type === ChartType.card) {
        if (chart.data && typeof chart.data !== 'object') {
          throw new errors.BadRequest("Invalid created from date format.");
        } else {
          chart.data = {};
        }
        if (!chart.data.backgroundColor) {
          chart.data.backgroundColor = random_rgba();
        }
        if (!chart.data.fontColor) {
          chart.data.fontColor = random_rgba();
        }
        if (!chart.data.hover) {
          chart.data.hover = random_rgba();
        }
      }
    });
    return charts;
  }

  async createReport(reportData) {
    try {
      let { name, clientId, workspaceId } = reportData;
      let report = await this.findOne({
        name: { $regex: name, $options: "i" },
        clientId,
        workspaceId,
      });
      if (!_.isEmpty(report)) {
        return Promise.reject(
          new errors.AlreadyExist(this.entityName + " already exist.")
          );
      }
      if (!Array.isArray(reportData.charts)) {
        reportData.charts = [];
      }
      await this.validateCharts(reportData.charts);
      return this.create(reportData);
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getDetails(id, workspaceId, clientId) {
    try {
      let report = await this.findOne({ id, workspaceId, clientId });
      if (_.isEmpty(report)) {
        return Promise.reject(
          new errors.NotFound(this.entityName + " not found.")
        );
      }
      return report;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateReport({ id, workspaceId, clientId }, updateValues) {
    try {
      if (updateValues.charts) {
        if (!Array.isArray(updateValues.charts))  {
          updateValues.charts = [];
        }
        updateValues.charts = await this.validateCharts(updateValues.charts);
      }
      let report = await this.getDetails(id, workspaceId, clientId);
      await this.update({ id: report.id }, updateValues);
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async deleteReport({ id, workspaceId, clientId }) {
    try {
      let report = await this.getDetails(id, workspaceId, clientId);
      let res = await this.softDelete(report.id);
      return res;
    } catch (err) {
      return this.handleError(err);
    }
  }

  parseFilters({ name, createdFrom, createdTo, workspaceId, clientId }) {
    let filters = {};
    filters.workspaceId = workspaceId;
    filters.clientId = clientId;

    if (name) {
      filters.name = { $regex: `^${name}`, $options: "i" };
    }

    if (createdFrom) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["$gte"] = createdFrom;
    }
    if (createdTo) {
      if (!filters.createdAt) {
        filters.createdAt = {};
      }
      filters.createdAt["$lt"] = createdTo;
    }

    return filters;
  }

  async retrieveReportChartData(charts = [], workspaceId, clientId) {
    // if
    let resp = [];
    for (let index = 0; index < charts.length; index++) {
      const chart = charts[index];
      let data = await this.loadChartDataForReport(
        chart,
        workspaceId,
        clientId
      );
      resp.push(data);
    }
    return resp;
  }

  async queryChartDataForReport(chart, workspaceId, clientId) {
    try {
      // if (ChartType.area == chart.type && Array.isArray(chart.data)) {
      //   console.log("length--------------------------->", chart.data.length);
      // }
      if (Array.isArray(chart.data) && chart.data.length) { // complicated
        let concat = [];
        for (let i = 0; i < chart.data.length; i++) {
          const ele = chart.data[i];
          if (i > 0) {
            concat.push('~~~');
          }
          if (ele.entityField === 'createdAt') {
            concat.push({$dateToString: { format: "%Y-%m", date: "$createdAt" },});
          } else {
            concat.push({ $ifNull: [`$${ele.entityField}`, "NA"] });
          }
        }
        let values = await this.ticketServiceInst.aggregate([
          // { $match: chart.conditions },
          {
            $group: {
              _id: {
                $concat: concat,
              },
              count: {$sum: 1}
            }
          }
        ]);
        return values;
      }
    } catch (error) {
      return {}
    }
  }

  /**
   * Queries chart data for a report
   * @param {Object} chart - Chart object
   * @param {string} workspaceId - Workspace ID
   * @param {string} clientId - Client ID
   * @returns {Object} chart - Chart object with queried data
   * @description
   * - Sets default conditions on chart if not already set
   * - Adds workspaceId and clientId to chart conditions
   * - Handles card chart type by counting tickets matching conditions
   * - Handles pie, bar, area, line charts by getting aggregated data and building maps to populate chart data array
  */
  async loadChartDataForReport(chart, workspaceId, clientId) {
    // Set default conditions
    if (!chart.conditions) {
      chart.conditions = {};
    }

    // Add workspaceId and clientId to conditions
    chart.conditions["workspaceId"] = workspaceId;
    chart.conditions["clientId"] = clientId;

    // Handle card chart type
    if (chart.type === ChartType.card) {
      chart.data.value = await this.ticketServiceInst.count(chart.conditions);
    }
    // Handle pie, bar, area, line chart types
    else if ([ChartType.pie, ChartType.bar, ChartType.area, ChartType.line].includes(chart.type)) {
      let values = await this.queryChartDataForReport(chart, workspaceId, clientId);
      let attributes = await getAttributeOptions(
        chart.entityField,
        { workspaceId, clientId },
        // filter
      );
      let attributeMap = {};
      for (let attr of attributes) {
        attributeMap[attr.id] = attr;
      }
      let dataMap = {};
      for (let row of values) {
        let id = row._id;
        dataMap[id] = {
          label: id,
          value: row.count,
          id: id,
        };
      }
        let labels = [];
        let datasets = {};
        if (chart.data.length > 1) {
          const result = values.reduce((acc, curr) => {
            const [month, id] = curr._id.split('~~~');
            if (!acc[id]) {
              acc[id] = [];
              datasets[id] = {
                id,
                label: attributeMap[id] ? attributeMap[id].name : id,
                backgroundColor: random_rgba(),
                borderWidth: 2,
                fill: true,
                data: []
              };
            }
            acc[id].push({ label: month, value: curr.count });
            labels.push(month);
            datasets[id].data.push(curr.count)
            return acc;
          }, {});
          // chart.data.value = result;
          chart.chartData = { labels, };
          chart.chartData.datasets = Object.values(datasets);
        } else {
          let datasets = [{
            data: [],
            backgroundColor: [],
            borderWidth: 2,
          }]
          const result = values.reduce((acc, curr) => {
            const id = curr._id;
            const label = attributeMap[id] ? attributeMap[id].name : id;
            // acc[id].push({ label, value: curr.count });
            labels.push(label);
            datasets[0].data.push(curr.count)
            datasets[0].backgroundColor.push(random_rgba())
            return acc;
          }, {});
          // chart.data.value = result;
          chart.chartData = { labels, };
          chart.chartData.datasets = Object.values(datasets);

          // Build final data array
        //   chart.chartData = {};
        //   chart.chartData.value = [];
        //   for (let id in dataMap) {
        //     let data = dataMap[id];
        //     if (attributeMap[id]) {
        //       data.label = attributeMap[id].name;
        //     }
        //     chart.chartData.value.push(data);
        //   }
        }
        /*{
            "type": "bar",
            "title":"test",
            options:{},
            chartData:{
                "labels":['January', 'February', 'March', 'April', 'May', ],
                "datasets":[
                    {
                        label: 'Dataset 2',
                        "backgroundColor": 'rgb(75, 192, 192)',
                        data: [100,200,300,400,500],
                        borderColor: 'white',
                        borderColor: 'rgb(153, 162, 235)',
                        borderWidth: 2,
                        fill: true,
                    }
                ]
            }
        },
        */

    }
    delete chart.conditions;
    return chart;
  }

}

module.exports = ReportService;
