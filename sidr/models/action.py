import copy
import pycountry
from sidr import validator, const
from sidr.orm import db, sa_utils
from sqlalchemy.orm import relationship, backref
from .model import ObjectTable, Query, QueryFilterEq, QueryFilterEqDate, QueryFilterLike

__all__ = ['action_types', 'Action', 'ActionQuery']


action_types = {
    'ADD_ENTRY': 1,
    'EDIT_ENTRY': 2,
    'ADD_LEAD': 3,
    'EDIT_LEAD': 4,
}


class Action(ObjectTable):
    __tablename__ = 'action'

    __export__ = {
        const.ACL_READ: ['id', 'action_type', 'user_id', 'object_id', 'domain_id', 'data', 'created_at']
    }

    action_type = db.Column(db.Integer)
    user_id = db.Column(db.BigInteger, db.ForeignKey('user.id'))
    object_id = db.Column(db.BigInteger)
    domain_id = db.Column(db.BigInteger, db.ForeignKey('domain.id'))
    data = db.Column(sa_utils.JSONType())

    @classmethod
    def mark(cls_, current_user, action_type, data, domain_id=None):
        r = {
            'user_id': current_user.id,
            'action_type': action_types[action_type],
            'data': data
        }
        if domain_id is not None:
            r['domain_id'] = domain_id

        action = cls_(**r)
        action.save()
        return action

    @classmethod
    def af_find(cls_, current_user, data):
        q = ActionQuery(current_user)
        q.assign_request(data)
        return q.execute()


class ActionQuery(Query):
    __model__ = Action
    __sortable__ = ['id', 'user_id', 'domain_id', 'action_type', 'data', 'domain_id']
    __sortable_default__ = ('id', 'DESC')
    __filters__ = {
        'id': QueryFilterEq(Action.id),
        'user_id': QueryFilterEq(Action.user_id),
    }

    def jsonify(self, row):
        rsp = row.jsonify(acl=const.ACL_READ)
        if row.user is not None:
            rsp['user'] = row.user.jsonify(acl=const.ACL_READ)
        return rsp

    def postprocess_query(self):
        self.q.join(Action.user)
