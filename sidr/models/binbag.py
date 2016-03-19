import uuid
from flask import current_app
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

    validate_schema = {
        "#name": "string",
        "#mime": "string"
    }

    validate_save = validator.parser(validate_schema, flip_hash='+')
    validate_update = validator.parser(validate_schema, flip_hash='?')

    @classmethod
    def af_save(cls_, current_user, data, file=None, obj_id=None):
        if obj_id is not None:
            data = cls_.validate_update.validate(data)
            binbag = cls_.get(obj_id, required=True)
            binbag.update(**data)
        else:
            data = cls_.validate_save.validate(data)
            data['reference'] = str(uuid.uuid4())
            binbag = cls_(**data)
            binbag.save()

        if file is not None:
            # we do it through a file because mysql is shit
            file.save("%s/%s" % (current_app.config['BINBAG_DIR'], binbag.reference))

        return binbag.jsonify(acl=const.ACL_READ)

    def get_content(self):
        with open("%s/%s" % (current_app.config['BINBAG_DIR'], self.reference), 'rb') as file_:
            return file_.read()
