from flask import current_app
from sidr.api import Resource, ApiError, current_user,  login_required, role_required
from sidr import models, const, validator


class OverviewResource(Resource):
    method_decorators = [login_required]

    def get(self, domain_id=None):
        rsp = {
            'lead_stats': models.Lead.get_overview(current_user, domain_id),
            'entry_stats': models.Entry.get_overview(current_user, domain_id),
        }
        return self.respond(rsp)


class OverviewLocationsResource(Resource):
    method_decorators = [login_required]

    def get(self, domain_id=None):
        rsp = {
            'locations': models.EntryLocation.get_overview(current_user, domain_id)
        }
        return self.respond(rsp)


def init_app(app):
    app.add_resource(OverviewResource, '/overview/<int:domain_id>')
    app.add_resource(OverviewLocationsResource, '/overview/locations/<int:domain_id>')
