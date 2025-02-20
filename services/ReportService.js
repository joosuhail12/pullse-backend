const Promise = require("bluebird");
const errors = require("../errors");
const supabase = require("../db/supabaseClient");
const BaseService = require("./BaseService");
const TicketService = require("./TicketService");
const _ = require("lodash");
const ChartType = require("../constants/ChartType");
const { getAttributeOptions } = require("../Utils/commonUtils");

function random_rgba() {
  var o = Math.round, r = Math.random, s = 255;
  return `rgba(${o(r() * s)},${o(r() * s)},${o(r() * s)},${r().toFixed(1)})`;
}

class ReportService extends BaseService {
  constructor() {
    super();
    this.ticketServiceInst = new TicketService();
    this.entityName = "Report";
  }

  async createReport(reportData) {
    try {
      let { name, clientId, workspaceId } = reportData;
      let { data: existingReport } = await supabase
        .from("reports")
        .select("*")
        .eq("name", name)
        .eq("clientId", clientId)
        .eq("workspaceId", workspaceId)
        .single();
      
      if (existingReport) {
        return Promise.reject(new errors.AlreadyExist("Report already exists."));
      }

      const { data, error } = await supabase.from("reports").insert([reportData]);
      if (error) throw error;
      return data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async getDetails(id, workspaceId, clientId) {
    try {
      let { data: report, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .eq("workspaceId", workspaceId)
        .eq("clientId", clientId)
        .single();
      
      if (error || !report) {
        return Promise.reject(new errors.NotFound("Report not found."));
      }
      return report;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async updateReport(id, workspaceId, clientId, updateValues) {
    try {
      if (updateValues.charts) {
        if (!Array.isArray(updateValues.charts)) {
          updateValues.charts = [];
        }
      }
      const { data, error } = await supabase
        .from("reports")
        .update(updateValues)
        .eq("id", id)
        .eq("workspaceId", workspaceId)
        .eq("clientId", clientId)
        .select();
      if (error) throw error;
      return data;
    } catch (err) {
      return this.handleError(err);
    }
  }

  async deleteReport(id, workspaceId, clientId) {
    try {
      const { error } = await supabase
        .from("reports")
        .delete()
        .eq("id", id)
        .eq("workspaceId", workspaceId)
        .eq("clientId", clientId);
      if (error) throw error;
      return { message: "Report deleted successfully." };
    } catch (err) {
      return this.handleError(err);
    }
  }

  async retrieveReportChartData(charts = [], workspaceId, clientId) {
    let resp = [];
    for (let chart of charts) {
      let data = await this.loadChartDataForReport(chart, workspaceId, clientId);
      resp.push(data);
    }
    return resp;
  }

  async loadChartDataForReport(chart, workspaceId, clientId) {
    try {
      chart.conditions = { workspaceId, clientId };
      if (chart.type === ChartType.card) {
        chart.data = await this.ticketServiceInst.count(chart.conditions);
      } else if ([ChartType.pie, ChartType.bar, ChartType.area, ChartType.line].includes(chart.type)) {
        let values = await this.queryChartDataForReport(chart, workspaceId, clientId);
        let attributes = await getAttributeOptions(chart.entityField, { workspaceId, clientId });
        let attributeMap = _.keyBy(attributes, "id");
        let labels = [], datasets = [{ data: [], backgroundColor: [] }];
        for (let row of values) {
          let id = row._id;
          labels.push(attributeMap[id] ? attributeMap[id].name : id);
          datasets[0].data.push(row.count);
          datasets[0].backgroundColor.push(random_rgba());
        }
        chart.chartData = { labels, datasets };
      }
      delete chart.conditions;
      return chart;
    } catch (error) {
      return this.handleError(error);
    }
  }
}

module.exports = ReportService;
