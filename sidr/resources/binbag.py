from flask import request, make_response
from werkzeug import secure_filename
from sidr.api import Resource, current_user, login_required
from sidr import models, const


class BinbagResource(Resource):
    method_decorators = [login_required]

    def post(self, obj_id=None):
        data = {}
        file = request.files['file']
        filename = secure_filename(file.filename)

        data = {
            'name': filename,
            'mime': file.content_type
        }
        return self.respond(models.Binbag.af_save(current_user, data, file, obj_id))

    """
    def get(self, obj_id=None):
        return self.respond(models.Binbag.get(obj_id, required=True).jsonify(acl=const.ACL_READ))
    """


class BinbagContentResource(Resource):
    def get(self, obj_id):
        binbag = models.Binbag.get(obj_id, required=True)
        print(repr(binbag.get_content()))
        response = make_response(binbag.get_content())
        response.headers["Content-Type"] = binbag.mime
        response.headers["Content-Disposition"] = "attachment; filename=%s" % binbag.name
        return response


def init_app(app):
    app.add_resource(BinbagResource, '/binbag', '/binbag/<int:obj_id>')
    app.add_resource(BinbagContentResource, '/binbag/<int:obj_id>/content')
