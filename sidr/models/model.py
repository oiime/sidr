import base64
import os
import json
import hashlib
from datetime import datetime
from sqlalchemy.ext.declarative import DeclarativeMeta
from sqlalchemy.sql import text
from sqlalchemy import and_

from sidr import const
from sidr.orm import db
from sidr.api import ResourceNotFoundError, FrobiddenError


json_encoders = {
    'datetime': lambda t: t.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
}


def json_encoder(export_fields):
    class AlchemyEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj.__class__, DeclarativeMeta):
                fields = {}
                for field in [x for x in dir(obj) if not x.startswith('_') and x in export_fields]:
                    data = obj.__getattribute__(field)
                    if type(data).__name__ in json_encoders:
                        data = json_encoders[type(data).__name__](data)
                    fields[field] = data
                return fields

            return json.JSONEncoder.default(self, obj)
    return AlchemyEncoder


class BaseTable(db.Model):
    __abstract__ = True

    def save(self):
        db.session.add(self)
        db.session.flush()

    def update(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
        self.save()

    @classmethod
    def find(cls_, **kwargs):
        q = db.session.query(cls_)
        if kwargs is not None:
            for k, v in kwargs.items():
                if isinstance(v, list):
                    q = q.filter(getattr(cls_, k).in_(v))
                else:
                    q = q.filter(getattr(cls_, k) == v)

        return q

    @classmethod
    def find_first(cls_, **kwargs):
        return cls_.find(**kwargs).first()

    @classmethod
    def delete(cls_, args):
        q = db.session.query(cls_)
        for k, v in args.items():
            q = q.filter(getattr(cls_, k) == v)
        q.delete()

    def jsonify(self, current_user=None, acl=None):
        if acl is not None:
            export_fields = self.__export__[acl]
        elif current_user.id == getattr(self, self.default_cmp_user_id):
            export_fields = self.__export__[const.ACL_OWNER]
        else:
            export_fields = self.__export__[const.ACL_READ]

        return json.loads(json.dumps(self, cls=json_encoder(export_fields)))


class ObjectTable(BaseTable):
    __abstract__ = True
    default_cmp_user_id = 'user_id'

    id = db.Column(db.BigInteger, primary_key=True)

    created_at = db.Column(db.DateTime, default=db.func.now())
    updated_at = db.Column(db.DateTime, default=db.func.now(), onupdate=db.func.now())

    @classmethod
    def get(cls_, obj_id, required=False):
        return cls_.find_first({'id': obj_id}, required=required)

    @classmethod
    def find_first(cls_, args, required=False):
        q = db.session.query(cls_)
        for k, v in args.items():
            q = q.filter(getattr(cls_, k) == v)
        if not required:
            return q.first()
        else:
            obj = q.first()
            if not hasattr(obj, 'id') or obj.id < 1:
                raise ResourceNotFoundError(cls_.__name__ + ' not found', object_id=id)
            return obj

    @classmethod
    def get_query(cls_):
        return db.session.query(cls_)

    @classmethod
    def get_restricted(cls_, current_user, obj_id, cmp_fieldname=None):
        if cmp_fieldname is None:
            cmp_fieldname = cls_.default_cmp_user_id

        row = cls_.get(obj_id, required=True)
        if current_user.id != getattr(row, cmp_fieldname):
            raise FrobiddenError('No access to object {0:d}'.format(row.id))
        return row


class QueryFilter():
    def __init__(self, field):
        self.field = field


class QueryFilterEq(QueryFilter):
    def apply(self, q, value):
        return q.filter(self.field == value)


class QueryFilterLike(QueryFilter):
    def apply(self, q, value):
        if len(value) == 0:
            return q
        return q.filter(self.field.like("%%%s%%" % value.encode('utf-8').decode('utf-8')))


class QueryFilterEqDate(QueryFilter):
    uformat = '%Y-%m-%d'
    unformat = '%Y-%m-%dT%H:%M:%S.%fZ'

    def apply(self, q, value):
        if isinstance(value, str):
            try:
                value = datetime.strptime(value, self.uformat)
            except ValueError:
                return q
            return q.filter(and_(self.field >= value.strftime('%Y-%m-%d 00:00:01'), self.field <= value.strftime('%Y-%m-%d 23:59:59')))

        elif isinstance(value, dict) and 'startDate' in value and 'endDate' in value:
            try:
                start = datetime.strptime(value['startDate'], self.unformat)
                end = datetime.strptime(value['endDate'], self.unformat)
            except ValueError as e:
                print(repr(e))
                return q
            return q.filter(and_(self.field >= start.strftime('%Y-%m-%d 00:00:01'), self.field <= end.strftime('%Y-%m-%d 23:59:59')))
        else:
            return q


# this is retarded...
class QueryFilterInJson(QueryFilter):
    def apply(self, q, value):
        return q.filter(self.field.contains(value))


class Query():
    def __init__(self, current_user=None, rtype='json'):
        self.q = self.__model__.query
        self.current_user = current_user
        self.limit = None
        self.offset = None
        self.rtype = rtype

        if hasattr(self, 'init_query'):
            self.q = self.init_query(self.q)

    def assign_request(self, data):
        if 'filter' in data:
            for k, v in data['filter'].items():
                if k in self.__filters__:
                    self.q = self.__filters__[k].apply(self.q, v)

        if 'count' in data:
            self.limit = int(data['count'])
        if 'page' in data:
            self.offset = (int(data['page'])-1) * int(data['count'])

        if ('sorting' in data or hasattr(self, '__sortable_default__')) and hasattr(self, '__sortable__'):
            usorting = {}
            if 'sorting' in data:
                for k, v in data['sorting'].items():
                    if k in self.__sortable__:
                        usorting[k] = 'DESC' if v.upper() == 'DESC' else 'ASC'

            if len(usorting) == 0 and hasattr(self, '__sortable_default__'):
                usorting[self.__sortable_default__[0]] = self.__sortable_default__[1]

            for fieldname, direction in usorting.items():
                if direction == 'DESC':
                    self.q = self.q.order_by(getattr(self.__model__, fieldname).desc())
                else:
                    self.q = self.q.order_by(getattr(self.__model__, fieldname))

    def execute(self):
        res = {
            'result': [],
            'total': 0
        }
        # get total first, we dont care about efficency
        res['total'] = self.q.count()
        if hasattr(self, 'postprocess_query'):
            self.postprocess_query()

        if self.limit is not None:
            self.q = self.q.limit(self.limit)
        if self.offset is not None:
            self.q = self.q.offset(self.offset)

        rows = self.q.all()
        for row in rows:
            if hasattr(self, 'jsonify'):
                res['result'].append(self.jsonify(row))
            else:
                res['result'].append(self.jsonfiy_fallback(row))

        if hasattr(self, 'postprocess_results'):
            res['result'] = self.postprocess_results(res['result'])

        if hasattr(self, 'postprocess_response'):
            return self.postprocess_response(res)
        return res

    def jsonfiy_fallback(self, row):
        return row.jsonify(self.current_user)


def random_string(context=None, length=64):
    return base64.b64encode(hashlib.sha512(os.urandom(1024)).digest()).decode("utf-8").replace("=", "").replace("+", "").replace("/", "")[:length]
