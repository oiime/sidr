from flask import current_app
from itsdangerous import JSONWebSignatureSerializer
from sidr.api import Resource, current_user, login_required, role_required, FrobiddenError
from sidr import models, const


class RegisterResource(Resource):

    def post(self):
        serializer = JSONWebSignatureSerializer(current_app.config['API_KEY'])

        user_json, user = models.User.af_save(current_user, self.get_request())
        token = serializer.dumps({"id": user.id, "signature": user.signature}).decode('utf-8')
        return self.respond({"token": token, "user": user_json})


class UserResource(Resource):
    method_decorators = [login_required]

    def post(self, obj_id=None):
        if obj_id != current_user.id:
            raise FrobiddenError('No permission to edit user')

        user_json, user = models.User.af_save(current_user, self.get_request(), obj_id)
        return self.respond(user_json)

    def get(self, obj_id=None):
        if obj_id != current_user.id:
            raise FrobiddenError('No permission to view user')

        return self.respond(models.User.get(obj_id, required=True).jsonify(acl=const.ACL_READ))


class UsersResource(Resource):
    method_decorators = [role_required(const.ROLE_ADMIN)]

    def get(self):
        return self.post()

    def post(self):
        return self.respond(models.User.af_find(current_user, self.get_request()))


class UsersMapResource(Resource):
    method_decorators = [login_required]

    def get(self):
        return self.post()

    def post(self):
        return self.respond(models.User.af_map(current_user))


def init_app(app):
    app.add_resource(RegisterResource, '/register')
    app.add_resource(UsersResource, '/users')
    app.add_resource(UsersMapResource, '/users/map')
    app.add_resource(UserResource, '/user', '/user/<int:obj_id>')
