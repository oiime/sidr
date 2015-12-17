import copy
import csv
import io
from sidr import validator, const
from sidr.orm import db, sa_utils
from .model import ObjectTable, Query, QueryFilterEq, QueryFilterEqDate, QueryFilterLike
from .user import User

__all__ = ['Lead']


class LeadType():
    pass


class LeadTypeAttachment(LeadType):
    validate_schema = {}

    validate_save = validator.parser(copy.copy(validate_schema), flip_hash='+', additional_properties=True)
    validate_update = validator.parser(copy.copy(validate_schema), flip_hash='?', additional_properties=True)


class LeadTypeManual(LeadType):
    validate_schema = {
        "#description": validator.String()
    }

    validate_save = validator.parser(copy.copy(validate_schema), flip_hash='+', additional_properties=True)
    validate_update = validator.parser(copy.copy(validate_schema), flip_hash='?', additional_properties=True)


class LeadTypeURL(LeadType):
    validate_schema = {
        "#url": validator.URL(),
        "#website": validator.String(),
    }

    validate_save = validator.parser(copy.copy(validate_schema), flip_hash='+', additional_properties=True)
    validate_update = validator.parser(copy.copy(validate_schema), flip_hash='?', additional_properties=True)


lead_type_dict = {
    'manual': LeadTypeManual(),
    'attachment': LeadTypeAttachment(),
    'url': LeadTypeURL()
}


class Lead(ObjectTable):
    __tablename__ = 'lead'

    __export__ = {
        const.ACL_READ: ['id', 'user_id', 'assignee_id', 'domain_id', 'lead_type', 'status', 'name', 'data', 'created_at', 'published_at', 'binbags', 'source_id', 'website', 'url']
    }

    user_id = db.Column(db.BigInteger, db.ForeignKey('user.id'), index=True)
    assignee_id = db.Column(db.BigInteger)
    domain_id = db.Column(db.BigInteger, db.ForeignKey('domain.id'), index=True)
    source_id = db.Column(db.BigInteger, db.ForeignKey('tag.id'), index=True)
    lead_type = db.Column(db.String(255))
    binbags = db.Column(sa_utils.JSONType())
    status = db.Column(db.SmallInteger, default=const.STATUS_PENDING)
    name = db.Column(db.String(255))
    description = db.Column(db.Text)
    website = db.Column(db.String(255))
    url = db.Column(db.Text)
    published_at = db.Column(db.DateTime)

    entries = db.relationship("Entry", backref="lead")

    validate_schema = {
        "?name": "string",
        "?status": validator.Enum([const.STATUS_ACTIVE, const.STATUS_INACTIVE, const.STATUS_PENDING, const.STATUS_DELETED]),
        "#domain_id": "integer",
        "#lead_type": validator.Enum(lead_type_dict.keys()),
        "#source_id": validator.Tag(tag_class='source'),
        "?description": "string",
        "?binbags": [{
            "mime": "string",
            "name": "string",
            "reference": "string",
            "id": "integer"
        }],
        "?published_at": validator.Timestamp()
    }

    validate_save = validator.parser(copy.copy(validate_schema), flip_hash='+', additional_properties=True)
    validate_update = validator.parser(copy.copy(validate_schema), flip_hash='?', additional_properties=True)

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        from sidr import models

        if obj_id is not None:
            action_type = 'EDIT_LEAD'
            data = cls_.validate_update.validate(data)
            lead = cls_.get(obj_id, required=True)
            if lead.lead_type is not None:
                data = lead_type_dict[lead.lead_type].validate_update.validate(data)
            lead.user_id = current_user.id
            lead.update(**data)
        else:
            action_type = 'ADD_LEAD'
            data = cls_.validate_save.validate(data)
            data = lead_type_dict[data['lead_type']].validate_save.validate(data)
            data['user_id'] = current_user.id
            lead = cls_(**data)
            lead.save()

        models.Action.mark(current_user, action_type, lead.jsonify(acl=const.ACL_READ), domain_id=lead.domain_id)
        return lead.jsonify(acl=const.ACL_READ)

    @classmethod
    def af_find(cls_, current_user, data, rtype='json'):
        q = LeadQuery(current_user, rtype=rtype)
        q.assign_request(data)
        return q.execute()

    @classmethod
    def get_overview(cls_, current_user, domain_id):
        sql = 'SELECT SUM(IF(TO_DAYS(NOW()) - TO_DAYS( created_at ) <= 1, 1, 0)) AS leads_today, SUM(IF(status=1, 1,0)) AS leads_active, SUM(IF(status=3, 1,0)) AS leads_pending from lead'
        sql += ' WHERE domain_id={0}'.format(int(domain_id))
        row = db.session.execute(sql).first()
        if row is None or row['leads_today'] is None:
            return {}
        return {
            'today': int(row['leads_today']),
            'active': int(row['leads_active']),
            'pending': int(row['leads_pending']),
        }


class LeadQuery(Query):
    __model__ = Lead
    __sortable__ = ['id', 'name', 'assignee_id', 'lead_type', 'created_at', 'published_at', 'source_id', 'website', 'status']
    __sortable_default__ = ('id', 'DESC')
    __filters__ = {
        'id': QueryFilterEq(Lead.id),
        'name': QueryFilterLike(Lead.name),
        'user_id': QueryFilterEq(Lead.user_id),
        'assignee_id': QueryFilterEq(Lead.assignee_id),
        'lead_type': QueryFilterEq(Lead.lead_type),
        'source_id': QueryFilterEq(Lead.source_id),
        'domain_id': QueryFilterEq(Lead.domain_id),
        'status': QueryFilterEq(Lead.status),
        'website': QueryFilterLike(Lead.website),
        'created_at': QueryFilterEqDate(Lead.created_at),
        'published_at': QueryFilterEqDate(Lead.created_at)
    }

    def jsonify(self, row):
        rsp = row.jsonify(acl=const.ACL_READ)
        if row.user is not None:
            rsp['user'] = row.user.jsonify(acl=const.ACL_READ)
        if row.assignee_id is not None:
            rsp['user_assigned'] = User.get(row.assignee_id).jsonify(acl=const.ACL_READ)
        return rsp

    def postprocess_results(self, rows):
        if len(rows) == 0:
            return rows

        lead_ids = []
        for row in rows:
            lead_ids.append(str(row['id']))

        cmap = {}
        crows = db.session.execute('SELECT COUNT(DISTINCT id) AS entries_count, lead_id FROM entry WHERE status != %s AND lead_id IN (%s)' % (const.STATUS_DELETED, ','.join(lead_ids)))
        for crow in crows:
            cmap[crow['lead_id']] = crow['entries_count']

        for row in rows:
            row['entries_count'] = cmap[row['id']] if row['id'] in cmap else 0
        return rows

    def postprocess_response(self, res):
        if self.rtype == 'csv':
            output = io.StringIO()
            writer = csv.writer(output, quoting=csv.QUOTE_NONNUMERIC)
            writer.writerow(['user_id', 'user_name', 'name', 'lead_type', 'source', 'website', 'url', 'entries_count', 'created_at', 'published_at'])
            for row in res['result']:
                writer.writerow([
                    row['user']['id'],
                    row['user']['name'],
                    row['name'],
                    row['lead_type'],
                    row['source_id'],
                    row['website'],
                    row['url'],
                    row['entries_count'],
                    row['created_at'],
                    row['published_at']
                ])
            return output.getvalue()
        else:
            return res

    def postprocess_query(self):
        self.q.join(Lead.user)
