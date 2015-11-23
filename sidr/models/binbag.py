import uuid

from sidr import validator, const
from sidr.orm import db, sa_utils
from .model import ObjectTable, Query, QueryFilterEq, QueryFilterInJson

__all__ = ['Binbag']


class Binbag(ObjectTable):
    __tablename__ = 'binbag'

    __export__ = {
        const.ACL_READ: ['id', 'name', 'mime', 'reference']
    }
    name = db.Column(db.String(255))
    reference = db.Column(db.String(64))
    mime = db.Column(db.String(255))
    content = db.Column(db.LargeBinary)

    validate_schema = {
        "#name": "string",
        "#mime": "string",
        "#content": validator.Bytes()
    }

    validate_save = validator.parser(validate_schema, flip_hash='+')
    validate_update = validator.parser(validate_schema, flip_hash='?')

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        if obj_id is not None:
            data = cls_.validate_update.validate(data)
            binbag = cls_.get(obj_id, required=True)
            binbag.update(**data)
        else:
            data = cls_.validate_save.validate(data)
            data['reference'] = str(uuid.uuid4())
            binbag = cls_(**data)
            binbag.save()

        return binbag.jsonify(acl=const.ACL_READ)
