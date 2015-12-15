from sidr.api import Resource, current_user, login_required, role_required
from sidr import models, const


class DomainResource(Resource):
    method_decorators = [role_required(const.ROLE_ADMIN)]

    def post(self, obj_id=None):
        return self.respond(models.Domain.af_save(current_user, self.get_request(), obj_id))

    def get(self, obj_id=None):
        return self.respond(models.Domain.get(obj_id, required=True).jsonify(acl=const.ACL_READ))


class DomainsResource(Resource):
    method_decorators = [login_required]

    def get(self):
        return self.post()

    def post(self):
        return self.respond(models.Domain.af_find(current_user, self.get_request()))


class DomainTagclassesResource(Resource):
    method_decorators = [login_required]

    def get(self, obj_id):
        return self.respond(models.DomainTagclass.af_domain_state(current_user, obj_id))


def init_app(app):
    app.add_resource(DomainResource, '/domain', '/domain/<int:obj_id>')
    app.add_resource(DomainTagclassesResource, '/domain_tagclasses/<int:obj_id>')
    app.add_resource(DomainsResource, '/domains')
