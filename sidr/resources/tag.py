from flask import current_app
from sidr.api import Resource, ApiError, current_user, login_required, role_required
from sidr import models, const, validator


class TagClassesResource(Resource):
    def get(self):
        return self.respond(models.Tag.af_tag_classes())


class TagResource(Resource):
    method_decorators = [login_required]

    @role_required(const.ROLE_ADMIN)
    def post(self, obj_id=None):
        return self.respond(models.Tag.af_save(current_user, self.get_request(), obj_id))

    def get(self, obj_id=None):
        return self.respond(models.Tag.get(obj_id, required=True).jsonify(acl=const.ACL_READ))

    @role_required(const.ROLE_ADMIN)
    def delete(self, obj_id=None):
        return self.respond(models.Tag.af_delete(obj_id))


class TagsResource(Resource):
    method_decorators = [login_required]

    def get(self):
        return self.post()

    def post(self):
        return self.respond(models.Tag.af_find(current_user, self.get_request()))


class TagClassResource(Resource):
    method_decorators = [role_required(const.ROLE_ADMIN)]

    def get(self, tag_class):
        return self.respond(models.DomainTagclass.af_get_tag_class_states(current_user, tag_class))

    def post(self, tag_class):
        return self.respond(models.DomainTagclass.af_update_tag_class(current_user, tag_class, self.get_request()))


def init_app(app):
    app.add_resource(TagClassesResource, '/tag_classes')
    app.add_resource(TagClassResource, '/tag_class', '/tag_class/<string:tag_class>')
    app.add_resource(TagResource, '/tag', '/tag/<int:obj_id>')
    app.add_resource(TagsResource, '/tags')
