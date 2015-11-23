#!/usr/bin/env python
# PYTHON_ARGCOMPLETE_OK
from flask.ext.script import Manager, Command
from sidr import app


class RebuildAll(Command):
    "rebuild database"

    def run(self):
        from sidr import orm
        orm.rebuild_all()


class CreateAll(Command):
    "create tables"

    def run(self):
        from sidr import orm
        orm.create_all()

manager = Manager(app)
manager.add_command('rebuild_all', RebuildAll())
manager.add_command('create_all', CreateAll())

if __name__ == "__main__":
    manager.run()
