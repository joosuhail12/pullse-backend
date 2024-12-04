const BaseHandler = require('./BaseHandler');
const ReportService = require('../services/ReportService');

class ReportHandler extends BaseHandler {

  constructor() {
    super();
  }

  async createReport(req, reply) {
    req.body.createdBy = req.authUser.id;
    req.body.clientId = req.authUser.clientId;
    req.body.workspaceId = req.query.workspace_id;

    let inst = new ReportService();
    return this.responder(req, reply, inst.createReport(req.body));
  }

  async listReport(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let filters = {
      name: req.query.name,
      createdFrom: req.query.created_from,
      createdTo: req.query.created_to,
      skip: req.query.skip,
      limit: req.query.limit,
      page: req.query.page,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order,
      workspaceId,
      clientId
    };
    let inst = new ReportService();
    return this.responder(req, reply, inst.paginate(filters));
  }

  async showReportDetail(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new ReportService();
    return this.responder(req, reply, inst.getDetails(req.params.report_id, workspaceId, clientId));
  }

  async retrieveReportChartData(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new ReportService();
    let report;
    try {
      report = await inst.getDetails(req.params.report_id, workspaceId, clientId);
      let data = await inst.retrieveReportChartData(report.charts, workspaceId, clientId);

      return this.responder(req, reply, Promise.resolve(data));
    } catch (error) {
      console.error(error);
      return this.responder(req, reply, Promise.reject(error));
    }
  }

  async updateReport(req, reply) {
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let id = req.params.report_id;
    let toUpdate = req.body;
    let inst = new ReportService();
    return this.responder(req, reply, inst.updateReport({ id, workspaceId, clientId }, toUpdate));
  }

  async deleteReport(req, reply) {
    let id = req.params.report_id;
    let workspaceId = req.query.workspace_id;
    let clientId = req.authUser.clientId;

    let inst = new ReportService();
    return this.responder(req, reply, inst.deleteReport({ id, workspaceId, clientId }));
  }

}

module.exports = ReportHandler;
