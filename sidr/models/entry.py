import csv
import io
import copy
import pycountry
from itertools import product
from sidr import validator, const
from sidr.orm import db, sa_utils
from sqlalchemy.orm import relationship, backref
from .model import ObjectTable, Query, QueryFilter, QueryFilterEq, QueryFilterEqDate, QueryFilterLike

__all__ = ['Entry', 'QueryEntries']


class Entry(ObjectTable):
    __tablename__ = 'entry'

    __export__ = {
        const.ACL_READ: ['id', 'user_id', 'domain_id', 'lead_id', 'status', 'name', 'country_code', 'created_at', 'excerpt', 'severity', 'reliability', 'status_ord', 'timeline', 'information_at']
    }

    status = db.Column(db.SmallInteger, default=const.STATUS_ACTIVE)
    user_id = db.Column(db.BigInteger, db.ForeignKey('user.id'), index=True)
    lead_id = db.Column(db.BigInteger, db.ForeignKey('lead.id'), index=True)
    domain_id = db.Column(db.BigInteger, db.ForeignKey('domain.id'), index=True)
    name = db.Column(db.Text)
    country_code = db.Column(db.String(3))
    excerpt = db.Column(db.Text)
    tags = relationship("EntryTag", backref="entry")
    locations = relationship("EntryLocation", backref="entry")
    severity = db.Column(db.Integer)
    reliability = db.Column(db.Integer)
    status_ord = db.Column(db.Integer)
    timeline = db.Column(db.Integer)
    information_at = db.Column(db.DateTime)

    validate_schema = {
        "#lead_id": "integer",
        "#severity": "integer",
        "#reliability": "integer",
        "?status": validator.Enum([const.STATUS_ACTIVE, const.STATUS_INACTIVE, const.STATUS_DELETED]),
        "#status_ord": validator.Tag(tag_class='status'),
        "#timeline": validator.Tag(tag_class='timeline'),
        "#country_code": validator.Enum([country.alpha2 for country in pycountry.countries]),
        "#tags": {
            '?sector': [validator.Tag(tag_class='sector')],
            '?vulnerable': [validator.TagBlock(tag_class='vulnerable')],
            '?affected': [validator.TagBlock(tag_class='affected')],
            '?underlying': [validator.Tag(tag_class='underlying')],
        },
        "#locations": [{
            "+source": validator.Enum([const.LOCATION_SOURCE_GEONAME, const.LOCATION_SOURCE_GOOGLE_MAP_SHAPE, const.LOCATION_SOURCE_SELF]),
            "+location_id": validator.AnyOf("string", "integer"),
            "+asciiname": "string",
            "?data": validator.AnyDict()
        }],
        "#excerpt": "string",
        "?information_at": validator.Timestamp()

    }

    validate_save = validator.parser(copy.copy(validate_schema), flip_hash='+')
    validate_update = validator.parser(copy.copy(validate_schema), flip_hash='?')

    @classmethod
    def af_save(cls_, current_user, data, obj_id=None):
        from sidr import models

        # cuz js is lame
        if 'lead_id' in data:
            data['lead_id'] = int(data['lead_id'])

        if obj_id is not None:
            action_type = 'EDIT_ENTRY'
            data = cls_.validate_update.validate(data)
            entry_data = {key: value for (key, value) in data.items() if key not in ['tags', 'locations']}
            entry = cls_.get(obj_id, required=True)
            entry.user_id = current_user.id
            entry.update(**entry_data)
        else:
            action_type = 'ADD_ENTRY'
            data = cls_.validate_save.validate(data)
            lead = models.Lead.get(data['lead_id'], required=True)
            data['user_id'] = current_user.id
            data['lead_id'] = lead.id
            data['domain_id'] = lead.domain_id
            entry_data = {key: value for (key, value) in data.items() if key not in ['tags', 'locations']}
            entry = cls_(**entry_data)
            entry.save()

        if 'locations' in data:
            models.EntryLocation.update_locations(entry, data['locations'])
        if 'tags' in data:
            models.EntryTag.update_tags(entry, data['tags'])

        models.Action.mark(current_user, action_type, entry.jsonify(acl=const.ACL_READ), domain_id=entry.domain_id)
        return entry.jsonify_complete(acl=const.ACL_READ)

    @classmethod
    def af_find(cls_, current_user, data, rtype='json'):
        q = EntryQuery(current_user, rtype=rtype)
        q.assign_request(data)
        return q.execute()

    @classmethod
    def get_overview(cls_, current_user, domain_id):
        sql = 'SELECT SUM(IF(TO_DAYS(NOW()) - TO_DAYS( created_at ) <= 1, 1, 0)) AS entries_today, SUM(IF(status=1, 1,0)) AS entries_active, SUM(IF(status=2, 1,0)) AS entries_inactive '
        for i in range(1, 7):
            sql += ' ,SUM(IF(status=1 AND severity={0}, 1,0)) AS severity_{0}_active, SUM(IF(status=2 AND severity={0}, 1,0)) AS severity_{0}_inactive'.format(i)
        sql += ' FROM entry WHERE domain_id={0}'.format(int(domain_id))
        row = db.session.execute(sql).first()
        if row is None or row['entries_today'] is None:
            return {}
        rsp = {
            'today': int(row['entries_today']),
            'active': int(row['entries_active']),
            'inactive': int(row['entries_inactive']),
            'severity': {}
        }
        for i in range(1, 7):
            rsp['severity'][i] = {
                'active': int(row['severity_%s_active' % i]),
                'inactive': int(row['severity_%s_inactive' % i])
            }
        return rsp

    def jsonify_complete(self, acl):
        rsp = self.jsonify(acl=acl)
        if self.tags is not None:
            utags = {}
            for tag in self.tags:
                if tag.tag_class not in utags:
                    utags[tag.tag_class] = []

                utag = {
                    'id': tag.tag_id
                }
                if isinstance(tag.data, dict):
                    utag.update(tag.data)

                utags[tag.tag_class].append(utag)

            rsp['tags'] = utags
        if self.locations is not None:
            rsp['locations'] = []
            for location in self.locations:
                rsp['locations'].append(location.jsonify(acl=const.ACL_READ))
        if self.user is not None:
            rsp['user'] = self.user.jsonify(acl=const.ACL_READ)
        if self.lead is not None:
            rsp['lead'] = self.lead.jsonify(acl=const.ACL_READ)
        return rsp


class QueryFilterTagIds(QueryFilter):
    def apply(self, q, value):
        from sidr.models import EntryTag

        if isinstance(value, int):
            value = [value]
        elif isinstance(value, list):
            pass
        else:
            return q

        subq = db.session.query(EntryTag.entry_id).filter(EntryTag.tag_id.in_(value)).group_by(EntryTag.entry_id).subquery()
        return q.join(subq, Entry.id == subq.c.entry_id)


class EntryQuery(Query):
    __model__ = Entry
    __sortable__ = ['id', 'user_id', 'domain_id', 'lead_id', 'status', 'name', 'country_code', 'created_at', 'excerpt', 'severity', 'reliability', 'status_ord', 'timeline', 'information_at']
    __sortable_default__ = ('id', 'DESC')
    __filters__ = {
        'id': QueryFilterEq(Entry.id),
        'user_id': QueryFilterEq(Entry.user_id),
        'tag_ids': QueryFilterTagIds(Entry.id),
        'lead_id': QueryFilterEq(Entry.lead_id),
        'domain_id': QueryFilterEq(Entry.domain_id),
        'country_code': QueryFilterEq(Entry.country_code),
        'status': QueryFilterEq(Entry.status),
        'severity': QueryFilterEq(Entry.severity),
        'reliability': QueryFilterEq(Entry.reliability),
        'status_ord': QueryFilterEq(Entry.status_ord),
        'timeline': QueryFilterEq(Entry.timeline),
        'created_at': QueryFilterEqDate(Entry.created_at),
        'information_at': QueryFilterEqDate(Entry.created_at)
    }

    def jsonify(self, row):
        return row.jsonify_complete(acl=const.ACL_READ)

    def postprocess_query(self):
        self.q.join(Entry.user)
        self.q.join(Entry.lead)
        self.q.join(Entry.tags)
        self.q.join(Entry.locations)

    def filter_tag_id(self, value):
        self.q.filter(self.__model__.tags.has(tag_id=value))

    def get_csv_tag_block(self, tag_class, row):
        opts = []
        if tag_class in row['tags']:
            opts = [self.tag_map[tag['id']] for tag in row['tags'][tag_class]]
            return ','.join(opts)
        else:
            return ''

    def get_csv_row(self, row):
        if not hasattr(self, 'tag_map'):
            from .tag import Tag
            self.tag_map = Tag.get_id_map()

        return [
            row['user']['id'] if 'user' in row else '',
            row['user']['name'] if 'user' in row else '',
            row['lead_id'],
            row['status'],
            self.get_csv_tag_block('sector', row),
            self.get_csv_tag_block('vulnerable', row),
            self.get_csv_tag_block('affected', row),
            self.get_csv_tag_block('underlying', row),
            row['created_at']
        ]

    def postprocess_response_csv(self, res):
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_NONNUMERIC)
        writer.writerow(['user_id', 'user_name', 'lead_id', 'status', 'sector', 'vulnerable', 'affected', 'underlying', 'created_at'])
        for row in res['result']:
            writer.writerow(self.get_csv_row(row))
        return output.getvalue()

    def extract_tag_permutations(self, row):
        opts = []
        rows = []
        for tag_class, tags in row['tags'].items():
            opt_group = []
            for tag in tags:
                opt_group.append((tag_class, tag))
            if len(opt_group) > 0:
                opts.append(opt_group)

        for selection in product(*opts):
            row = copy.deepcopy(row)
            row['tags'] = {}
            for utag in selection:
                tag_class, tag = utag
                if tag_class not in row['tags']:
                    row['tags'][tag_class] = []
                row['tags'][tag_class].append(tag)
            rows.append(row)
        return rows

    def postprocess_response_csv_permutated(self, res):
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_NONNUMERIC)
        writer.writerow(['user_id', 'user_name', 'lead_id', 'status', 'sector', 'vulnerable', 'affected', 'underlying', 'created_at'])
        rows = []
        for row in res['result']:
            rows.extend(self.extract_tag_permutations(row))

        for row in rows:
            writer.writerow(self.get_csv_row(row))

        return output.getvalue()

    def postprocess_response(self, res):
        if self.rtype == 'csv_permutated':
            return self.postprocess_response_csv_permutated(res)

        if self.rtype == 'csv':
            return self.postprocess_response_csv(res)
        else:
            return res
