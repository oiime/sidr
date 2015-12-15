from sidr import validator
from sidr.orm import db, sa_utils
from .model import ObjectTable

__all__ = ['DomainTagclass']


class DomainTagclass(ObjectTable):
    __tablename__ = 'domain_tagclass'

    domain_id = db.Column(db.BigInteger, db.ForeignKey('domain.id'), index=True, nullable=True)
    tag_class = db.Column(db.String(255), index=True, nullable=False)
    state = db.Column(sa_utils.JSONType())

    @classmethod
    def af_domain_state(cls_, current_user, domain_id):
        rsp = {
            'exclude_tag_classes': []
        }
        rows = cls_.find(domain_id=domain_id).all()
        for row in rows:
            if 'exclude_display' in row.state and row.state['exclude_display'] is True:
                rsp['exclude_tag_classes'].append(row.tag_class)

        return rsp

    @classmethod
    def af_update_tag_class(cls_, current_user, tag_class, data):
        cls_.delete({'tag_class': tag_class})
        rows = {}

        if 'exclude_domain_ids' in data:
            for domain_id in data['exclude_domain_ids']:
                rows[domain_id] = {
                    'exclude_display': True
                }

        for domain_id, state in rows.items():
            udate = {
                'domain_id': domain_id,
                'tag_class': tag_class,
                'state': state
            }
            el = cls_(**udate)
            el.save()

        return cls_.af_get_tag_class_states(current_user, tag_class)

    @classmethod
    def af_get_tag_class_states(cls_, current_user, tag_class):
        rsp = {
            'exclude_domain_ids': []
        }
        rows = cls_.find(tag_class=tag_class).all()
        for row in rows:
            if 'exclude_display' in row.state and row.state['exclude_display'] is True:
                rsp['exclude_domain_ids'].append(row.domain_id)

        return rsp
