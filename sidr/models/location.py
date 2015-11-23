import copy
import pycountry
from flask.ext.login import UserMixin
from sqlalchemy.exc import IntegrityError
from sidr import validator, const
from sidr.orm import db, sa_utils
from sidr.validator import ApiValidationError, ValidationError
from .model import ObjectTable, Query, QueryFilterEq, QueryFilterEqDate, random_string

__all__ = ['Location']


class Location(ObjectTable):
    __tablename__ = 'location'
    __export__ = {
        const.ACL_READ: ['id', 'code', 'level', 'parent_id', 'longtitude', 'latitude', 'name', 'country_code']
    }
    name = db.Column(db.String(255))
    code = db.Column(db.String(255), index=True)
    level = db.Column(db.String(255))
    parent_code = db.Column(db.String(255), index=True)
    longtitude = db.Column(db.Integer)
    latitude = db.Column(db.Integer)
    country_code = db.Column(db.String(3))
    tree = db.Column(sa_utils.JSONType())
    status = db.Column(db.SmallInteger, default=const.STATUS_ACTIVE)

    validate_schema = {
        "#name": "string",
        "#code": "string",
        "?level": "string",
        "?longtitude": "integer",
        "?latitude": "integer",
        "?parent_code": "string",
        "#country_code": validator.Enum([country.alpha2 for country in pycountry.countries])
    }

    validate_save = validator.parser(copy.copy(validate_schema), flip_hash='+', additional_properties=True)
    validate_update = validator.parser(copy.copy(validate_schema), flip_hash='?', additional_properties=True)

    def deduce_tree(self):
        if len(self.parent_code) < 1:
            self.update(level=1)
            return

        tree = []
        level = 2
        f_code = self.parent_code
        while(True):
            p = Location.find_first({'code': f_code})
            tree.insert(0, {'code': p.code, 'name': p.name, 'id': p.id})
            if len(p.parent_code) < 1:
                break
            else:
                f_code = p.parent_code
                level = level + 1

        self.update(level=level, tree=tree)

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        if obj_id is not None:
            data = cls_.validate_update.validate(data)
            location = cls_.get(obj_id, required=True)
            location.update(**data)
        else:
            data = cls_.validate_save.validate(data)
            location = cls_(**data)
            location.save()

        return location.jsonify(acl=const.ACL_READ)

    @classmethod
    def bsave(cls_, data):
        location = cls_.find_first({'country_code': data['country_code'], 'code': data['code']})
        if location is None:
            location = cls_(**data)
            location.save()
        else:
            location.update(**data)

        location.deduce_tree()

    @classmethod
    def af_find(cls_, current_user, data):
        q = LocationQuery(current_user)
        q.assign_request(data)
        return q.execute()

    @classmethod
    def af_autocomplete(cls_, country_code, value):
        rsp = []
        rows = cls_.get_query().filter(db.or_(cls_.name.like("%" + value + "%"), cls_.code.like("%" + value + "%"))).filter(cls_.country_code == country_code).limit(15).all()
        for row in rows:
            rsp.append(row.jsonify(acl=const.ACL_READ))
        return {'results': rsp}


class LocationQuery(Query):
    __model__ = Location
    __sortable__ = ['id', 'name', 'code', 'country_code']
    __sortable_default__ = ('code', 'DESC')
    __filters__ = {
        'id': QueryFilterEq(Location.id),
        'country_code': QueryFilterEq(Location.country_code),
    }

    def jsonify(self, row):
        rsp = row.jsonify(acl=const.ACL_READ)
        return rsp
