import csv
from flask import current_app, request
from sidr.api import Resource, ApiError, current_user,  login_required, role_required
from sidr import models, const, validator


class LocationsResource(Resource):
    method_decorators = [role_required(const.ROLE_ADMIN)]

    def get(self):
        return self.post()

    def post(self):
        return self.respond(models.Location.af_find(current_user, self.get_request()))


class LocationGeonameFinderResource(Resource):
    method_decorators = [login_required]

    def get(self, country_code=None, value=None):
        return self.respond(models.Geoname.af_autocomplete(country_code, value))


class LocationsCSVResource(Resource):
    method_decorators = [login_required]

    def post(self):
        validate_row = validator.parser({
            "+ADM_CODE": "string",
            "+ADM_PARENT_CODE": "string",
            "+COUNTRY_CODE": "string",
            "+ADM_NAME": "string"
        })
        try:
            ref_map = {}
            id_map = {}
            records = []

            file = request.files['file']
            reader = csv.DictReader(file.read().decode("utf-8").split('\n'), delimiter=',')
            for row in reader:
                row = validate_row.validate(row)
                id_map[row['ADM_CODE']] = True
                if len(row['ADM_PARENT_CODE']) > 0:
                    ref_map[row['ADM_PARENT_CODE']] = True
                records.append(row)

            for parent_code in ref_map.keys():
                if parent_code not in id_map:
                    raise ApiError('Missing parent code for: %s' % parent_code)

            for record in records:
                models.Location.bsave({
                    'name': record['ADM_NAME'],
                    'code': record['ADM_CODE'],
                    'parent_code': record['ADM_PARENT_CODE'],
                    'country_code': record['COUNTRY_CODE']
                })

            return self.respond({'success': True})
        except csv.Error as e:
            raise ApiError(str(e))


class LocationsAutocompleteResource(Resource):
    method_decorators = [login_required]

    def get(self, country_code=None, value=None):
        return self.respond(models.Location.af_autocomplete(country_code, value))


def init_app(app):
    app.add_resource(LocationGeonameFinderResource, '/geoname/<string:country_code>/<string:value>')
    app.add_resource(LocationsResource, '/locations')
    app.add_resource(LocationsAutocompleteResource, '/location/autocomplete/<string:country_code>/<string:value>')
    app.add_resource(LocationsCSVResource, '/location/csv')
