from mongoengine import Document, StringField, DateTimeField
from datetime import datetime

class Course(Document):
    title = StringField(max_length=255, required=True)
    description = StringField()
    created_at = DateTimeField(default=datetime.utcnow)

    def __str__(self):
        return self.title