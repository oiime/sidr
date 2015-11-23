from flask import request
from sidr.api import Resource, current_user, login_required
from sidr import models, const


class EntryResource(Resource):
    method_decorators = [login_required]

    def post(self, obj_id=None):
        return self.respond(models.Entry.af_save(current_user, self.get_request(), obj_id))

    def get(self, obj_id=None):
        return self.respond(models.Entry.get(obj_id, required=True).jsonify_complete(acl=const.ACL_READ))


class EntriesResource(Resource):
    method_decorators = [login_required]

    def get(self):
        return self.post()

    def post(self):
        rtype = request.args.get('rtype', 'json')
        rsp = models.Entry.af_find(current_user, self.get_request(), rtype)
        return self.respond(rsp, rtype=rtype)


def init_app(app):
    app.add_resource(EntryResource, '/entry', '/entry/<int:obj_id>')
    app.add_resource(EntriesResource, '/entries')
