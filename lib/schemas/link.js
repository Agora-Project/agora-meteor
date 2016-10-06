this.Schema || (this.Schema = {});

this.Schema.Link = new SimpleSchema({
  sourceId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },
  targetId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id
  },
  ownerId: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
    optional: true
  },
  type: {
    type: String,
    optional: true
  },
  createdAt: {
    type: Date,
    optional: true
  }
});

this.Link = new Mongo.Collection('links');

this.Link.attachSchema(this.Schema.Link);

this.Link.before.insert(function(userId, link) {
  return link.createdAt = Date.now();
});
