import pycountry

from sidr import validator, const
from sidr.orm import db, sa_utils
from .model import ObjectTable, Query, QueryFilterEq, QueryFilterInJson

__all__ = ['Domain']


class Domain(ObjectTable):
    __tablename__ = 'domain'

    __export__ = {
        const.ACL_READ: ['id', 'name', 'name_display', 'description', 'restrict_countries', 'event_types']
    }
    name = db.Column(db.String(255))
    name_display = db.Column(db.String(255))
    description = db.Column(db.Text)
    status = db.Column(db.SmallInteger, default=const.STATUS_ACTIVE)
    restrict_countries = db.Column(sa_utils.JSONType())
    event_types = db.Column(sa_utils.JSONType())

    validate_schema = {
        "#name": "string",
        "#name_display": "string",
        "?description": "string",
        "?restrict_countries": [validator.Enum([country.alpha2 for country in pycountry.countries])],
        "?event_types": [validator.Tag(tag_class='event_type')]
    }

    validate_save = validator.parser(validate_schema, flip_hash='+')
    validate_update = validator.parser(validate_schema, flip_hash='?')

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        if obj_id is not None:
            data = cls_.validate_update.validate(data)
            domain = cls_.get(obj_id, required=True)
            domain.update(**data)
        else:
            data = cls_.validate_save.validate(data)
            domain = cls_(**data)
            domain.save()

        return domain.jsonify(acl=const.ACL_READ)

    @classmethod
    def af_find(cls_, current_user, data):
        q = DomainQuery(current_user)
        q.assign_request(data)
        return q.execute()


class DomainQuery(Query):
    __model__ = Domain
    __sortable__ = ['id', 'name', 'name_display', 'restrict_countries', 'event_types']
    __sortable_default__ = ('id', 'DESC')
    __filters__ = {
        'id': QueryFilterEq(Domain.id),
        'name': QueryFilterEq(Domain.name),
        'restrict_countries': QueryFilterInJson(Domain.restrict_countries),
        'event_types': QueryFilterInJson(Domain.event_types)
    }

    def jsonify(self, row):
        return row.jsonify(acl=const.ACL_READ)
