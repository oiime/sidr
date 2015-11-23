import re
from datetime import datetime, date
from valideer import *
from sidr.api import ApiError


class ApiValidationError(ApiError):
    status_code = 400
    default_err_code = 'BAD_REQUEST'


    def __init__(self, e):
        super().__init__(str(e))
        self.payload = {
            'value': str(e.value),
            'context': e.context
        }


class SchemaWrapper():
    def __init__(self, schema, additional_properties=Object.REMOVE):
        with parsing(additional_properties=additional_properties):
            self.validator = parse(schema)

    def validate(self, data):
        try:
            return self.validator.validate(data)
        except ValidationError as e:
            raise ApiValidationError(e)


class AnyDict(Object):
    def validate(self, value, adapt=True):
        if not isinstance(value, dict):
            raise ValidationError("Not a valid object", value)
        return value


class Timestamp(String):
    uformat = '%Y-%m-%dT%H:%M:%S.%fZ'
    name = "timestamp"

    def validate(self, value, adapt=True):
        if type(value) in [date, datetime]:
            return value

        value = super(Timestamp, self).validate(value)
        try:
            value = datetime.strptime(value, self.uformat)
        except ValueError as e:
            raise ValidationError("Not a valid datetime format", value)

        return value


class Bytes(Type):
    def validate(self, value, adapt=True):
        return value


class Tag(Integer):

    def __init__(self, tag_class=None):
        super(Integer, self).__init__()
        self.tag_class = tag_class

    def validate(self, value, adapt=True):
        from sidr import models
        value = super(Integer, self).validate(value)
        tag = models.Tag.get(value)
        if tag is None:
            raise ValidationError("Tag not found", value)
        if self.tag_class is not None and tag.tag_class != self.tag_class:
            raise ValidationError("Tag of wrong class %s" % self.tag_class, value)

        return value

class Email(Pattern):
    name = "email"
    regexp = re.compile(r".+@.+\..+", re.I)

    def validate(self, value, adapt=True):
        value = super(Email, self).validate(value)
        return value.lower() if adapt else value


class URL(Pattern):
    name = 'url'
    regexp = re.compile(
        r'^https?://'
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        r'(?::\d+)?'
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    def validate(self, value, adapt=True):
        value = super(URL, self).validate(value)
        return value


def parser(schema, flip_hash=None, additional_properties=Object.REMOVE):
    if flip_hash is not None:
        for k in schema.keys():
            if '#' in k:
                schema[k.replace('#', flip_hash)] = schema.pop(k)

    return SchemaWrapper(schema, additional_properties=additional_properties)
