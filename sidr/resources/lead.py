from flask import current_app, request
from sidr.api import Resource, ApiError, current_user,  login_required, role_required
from sidr import models, const, validator


class LeadResource(Resource):
    method_decorators = [login_required]

    def post(self, obj_id=None):
        return self.respond(models.Lead.af_save(current_user, self.get_request(), obj_id))

    def get(self, obj_id=None):
        return self.respond(models.Lead.get(obj_id, required=True).jsonify(acl=const.ACL_READ))


class LeadsResource(Resource):
    method_decorators = [login_required]

    def get(self):
        return self.post()

    def post(self):
        rtype = request.args.get('rtype', 'json')
        rsp = models.Lead.af_find(current_user, self.get_request(), rtype)
        return self.respond(rsp, rtype=rtype)


def init_app(app):
    app.add_resource(LeadResource, '/lead', '/lead/<int:obj_id>')
    app.add_resource(LeadsResource, '/leads')
