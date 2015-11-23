from flask import current_app
from sidr.api import Resource, ApiError, current_user,  login_required, role_required
from sidr import models, const, validator


class ActionsResource(Resource):
    method_decorators = [login_required]

    def get(self):
        return self.post()

    def post(self):
        return self.respond(models.Action.af_find(current_user, self.get_request()))


def init_app(app):
    app.add_resource(ActionsResource, '/actions')
