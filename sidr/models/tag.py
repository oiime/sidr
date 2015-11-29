import copy
from sidr import validator, const
from sidr.orm import db, sa_utils
from .model import ObjectTable, Query, QueryFilterEq

__all__ = ['Tag']


class TagClass():
    __structure__ = {
        'name': {
            'title': 'Name',
            'desc': 'Description',
            'display': 'text',
            'edit': 'text'
        },
        'description': {
            'title': 'Description',
            'display': 'textarea',
            'edit': 'textarea'
        },
        'title': {
            'title': 'Title',
            'display': 'text',
            'edit': 'text'
        }
    }

    def validate(self, data, obj_id=None):
        vobj = {
            "?tag_class": validator.Enum(tag_class_dict.keys()),
            "?parent_id": validator.Integer()
        }
        for name, props in self.__structure__.items():
            if props['edit'] == 'text':
                vobj[('+' if obj_id is None else '?') + name] = "string"

        data = validator.parser(vobj).validate(data)
        # restructure
        rs_data = dict()
        for k, v in data.items():
            if k in ['tag_class', 'name', 'restricted_domains', 'id', 'parent_id']:
                rs_data[k] = v
            else:
                if 'data' not in rs_data:
                    rs_data['data'] = dict()
                rs_data['data'][k] = v
        return rs_data

    def jsonify_metadata(self):
        rsp = {}
        rsp['structure'] = self.__structure__
        if hasattr(self, '__parameters__'):
            rsp['parameters'] = self.__parameters__
        rsp['title'] = self.__title__
        return rsp

    def jsonify_tag(self, tag):
        rsp = {
            'id': tag.id,
            'tag_class': tag.tag_class,
            'name': tag.name,
            'tree': tag.tree
        }
        if tag.data is not None:
            for fieldname in self.__structure__.keys():
                if fieldname in tag.data:
                    rsp[fieldname] = tag.data[fieldname]

        return rsp


class TagClassEventType(TagClass):
    __title__ = 'Event Type'
    __structure__ = copy.deepcopy(TagClass.__structure__)


class TagClassSector(TagClass):
    __title__ = 'Sector'
    __structure__ = copy.deepcopy(TagClass.__structure__)


class TagClassAffected(TagClass):
    __title__ = 'Affected Group'
    __structure__ = copy.deepcopy(TagClass.__structure__)
    __parameters__ = {
        'cases': {
            'title': 'Cases',
            'display': 'text',
            'description': 'Enter number of known cases, leave empty if unknown',
            'edit': 'text'
        }
    }


class TagClassVulnerable(TagClass):
    __title__ = 'Vulnerable Group'
    __structure__ = copy.deepcopy(TagClass.__structure__)
    __parameters__ = {
        'cases': {
            'title': 'Cases',
            'display': 'text',
            'description': 'Enter number of known cases, leave empty if unknown',
            'edit': 'text'
        }
    }


class TagClassUnderlying(TagClass):
    __title__ = 'Underlying Factor'
    __structure__ = copy.deepcopy(TagClass.__structure__)


class TagClassStatus(TagClass):
    __title__ = 'Status'
    __structure__ = copy.deepcopy(TagClass.__structure__)


class TagClassTimeline(TagClass):
    __title__ = 'Problem Timeline'
    __structure__ = copy.deepcopy(TagClass.__structure__)


class TagClassSource(TagClass):
    __title__ = 'Source'
    __structure__ = copy.deepcopy(TagClass.__structure__)

tag_class_dict = {
    'vulnerable': TagClassVulnerable(),
    'affected': TagClassAffected(),
    'underlying': TagClassUnderlying(),
    'source': TagClassSource(),
    'sector': TagClassSector(),
    'status': TagClassStatus(),
    'timeline': TagClassTimeline(),
    'event_type': TagClassEventType()
}


class Tag(ObjectTable):
    __tablename__ = 'tag'

    __export__ = {
        const.ACL_READ: ['id', 'tag_class', 'name', 'data', 'restricted_domains', 'tree']
    }

    tag_class = db.Column(db.String(255))
    status = db.Column(db.SmallInteger, default=const.STATUS_ACTIVE)
    name = db.Column(db.String(255))
    data = db.Column(sa_utils.JSONType())
    restrict_domains = db.Column(sa_utils.ScalarListType())
    parent_id = db.Column(db.BigInteger, db.ForeignKey('tag.id'))
    tree = db.Column(sa_utils.JSONType())
    validate_save = validator.parser({
        "+tag_class": validator.Enum(tag_class_dict.keys()),
        "?parent_id": validator.Integer()
    }, additional_properties=True)

    @classmethod
    def af_tag_classes(cls_):
        rsp = []
        for name, obj in tag_class_dict.items():
            rsp.append({
                'name': name,
                'metadata': obj.jsonify_metadata()
            })

        return {'result': rsp, 'total': len(rsp)}

    @classmethod
    def af_delete(cls_, obj_id):
        tag = cls_.get(obj_id, required=True)
        tag.update(**{'status': const.STATUS_DELETED})
        return tag.jsonify(acl=const.ACL_READ)

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        data = cls_.validate_save.validate(data)
        data = tag_class_dict[data['tag_class']].validate(data, obj_id)

        if 'parent_id' in data:
            parents = cls_.get_parenthood(data['parent_id'])
            tree = []
            for parent in parents:
                tree.append({'id': parent.id, 'name': parent.name, 'title': parent.data['title']})
            data['tree'] = tree

        if obj_id is not None:
            tag = cls_.get(obj_id, required=True)
            tag.update(**data)
            return tag.jsonify(acl=const.ACL_READ)
        else:
            tag = cls_(**data)
            tag.save()
            return tag.jsonify(acl=const.ACL_READ)

    @classmethod
    def af_find(cls_, current_user, data):
        q = TagQuery(current_user)
        q.assign_request(data)
        return q.execute()

    @classmethod
    def get_parenthood(cls_, obj_id, parents=None):
        if parents is None:
            parents = []

        if obj_id == 0 or obj_id is None:
            return parents

        obj = cls_.get(obj_id)
        parents.append(obj)
        return cls_.get_parenthood(obj.parent_id, parents=parents)

    @classmethod
    def get_id_map(cls_):
        umap = {}
        rows = cls_.find().all()
        for row in rows:
            umap[row.id] = row.name
        return umap

    def jsonify(self, acl=None):
        return tag_class_dict[self.tag_class].jsonify_tag(self)


class TagQuery(Query):
    __model__ = Tag
    __filters__ = {
        'tag_class': QueryFilterEq(Tag.tag_class),
        'id': QueryFilterEq(Tag.id),
        'name': QueryFilterEq(Tag.name)
    }

    def jsonify(self, row):
        return tag_class_dict[row.tag_class].jsonify_tag(row)

    def init_query(self, q):
        return q.filter(Tag.status != const.STATUS_DELETED)
