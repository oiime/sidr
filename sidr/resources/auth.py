from flask import current_app
from itsdangerous import JSONWebSignatureSerializer
from sidr.api import Resource, ApiError, current_user
from sidr import models, const, validator

authSchema = {
    "+email": 'string',
    "+password": 'string',
}
validator = validator.parser(authSchema)


class AuthResource(Resource):

    def post(self):
        serializer = JSONWebSignatureSerializer(
            current_app.config['API_KEY'])
        args = validator.validate(self.get_request())

        user = models.User.find_first({'email': args['email']})
        if user is None or user.password != args['password']:
            raise ApiError("Wrong email or password provided for {}".format(args['email']))

        if user.status is not const.STATUS_ACTIVE:
            raise ApiError("User is not active")

        token = serializer.dumps({"id": user.id, "signature": user.signature}).decode('utf-8')
        return self.respond({"token": token, "user": user.jsonify(user)})


def init_app(app):
    app.add_resource(AuthResource, '/auth', '/auth')
