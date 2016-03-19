import itsdangerous
import logging
import json
from werkzeug.exceptions import BadRequest
from flask.ext.login import LoginManager, login_required, current_user
from flask import Flask, request_finished, current_app, jsonify, request, make_response
from flask.ext import restful
from functools import wraps

from sidr.orm import db
from sidr import const

logger = logging.getLogger(__name__)

http_codes = {
    401: 'Unauthorized',
    405: 'Method Not Allowed'
}


def role_required(role):
    def wrapped_decorator(func):
        @wraps(func)
        def decorated_view(*args, **kwargs):
            if not current_user.is_authenticated():
                return current_app.login_manager.unauthorized()
            if current_user.role != role:
                return current_app.login_manager.unauthorized()
            return func(*args, **kwargs)
        return decorated_view
    return wrapped_decorator


class ApiError(Exception):
    status_code = 400
    default_err_code = 'UNKNOWN'

    def __init__(self, message, status_code=None, payload=None, err_code=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload
        self.err_code = err_code if err_code is not None else self.default_err_code

    def to_user_json(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        rv['err_code'] = self.err_code
        return rv


class ResourceNotFoundError(ApiError):
    status_code = 404
    default_err_code = 'RESOURCE_NOT_FOUND'


class AuthError(ApiError):
    status_code = 401
    default_err_code = 'AUTH_ERROR'


class FrobiddenError(ApiError):
    status_code = 403
    default_err_code = 'FORBIDDEN_ERROR'


class AdaptedApi(restful.Api):
    def __init__(self, app, prefix='', default_mediatype='application/json', decorators=None):
        super().__init__(app, prefix, default_mediatype, decorators)
        app.handle_exception = self.handle_exception
        app.handle_user_exception = self.handle_user_exception

    def handle_exception(self, e):
        return Flask.handle_exception(self.app, e)

    def handle_user_exception(self, e):
        return Flask.handle_user_exception(self.app, e)


class Resource(restful.Resource):
    def respond(self, obj, http_code=200, rtype='json'):
        if rtype in ['csv', 'csv_permutated']:
            response = make_response(obj)
            response.headers["Content-Disposition"] = "attachment; filename=export.csv"
            response.headers["Content-type"] = "text/csv"
            return response
        else:
            response = jsonify(obj)
            response.status_code = http_code
            return response

    def get_request(self):
        try:
            obj = request.get_json(force=True)
        except BadRequest:
            obj = {}

        return obj


def when_request_finished(sender, response, **extra):
    db.session.commit()


def init_app(bp, app):
    print(repr("hello"))
    app.config['MAX_CONTENT_LENGTH'] = 64 * 1024 * 1024
    api = AdaptedApi(bp)
    serializer = itsdangerous.JSONWebSignatureSerializer(app.config['API_KEY'])

    login_manager = LoginManager()
    login_manager.init_app(app)

    request_finished.connect(when_request_finished, app)

    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify({'error': 'unknown endpoint: %s' % request.base_url}), 404

    @app.errorhandler(ApiError)
    def apierror(e):
        db.session.rollback()
        logger.info(e)
        response = jsonify(e.to_user_json())
        response.status_code = e.status_code
        logger.debug(repr(e.to_user_json()))
        return response

    @login_manager.request_loader
    def load_user_from_request(request):
        from sidr import models
        user = None
        auth_payload = request.headers.get('Authorization')
        if not auth_payload and request.args.get('auth'):
            auth_payload = request.args.get('auth')

        if auth_payload:
            try:
                auth_payload = auth_payload.replace('Basic ', '', 1)
                payload = serializer.loads(auth_payload)
                user = models.User.get(payload['id'])
                if user is None:
                    raise AuthError('Unknown user')

                if payload['signature'] != user.signature:
                    raise AuthError('Object signature is broken')
                elif user.status != const.STATUS_ACTIVE:
                    raise AuthError('User is not active')
                else:
                    return user

            except itsdangerous.SignatureExpired:
                raise AuthError('Signature expired')
            except itsdangerous.BadSignature:
                raise AuthError('Bad Signature')

        return None

    return api
