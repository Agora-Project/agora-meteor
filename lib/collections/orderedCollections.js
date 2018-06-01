this.FollowerLists = new Mongo.Collection('followerlists');
this.FollowingLists = new Mongo.Collection('followinglists');

let validateOrderedCollection = function(orderedCollection, mongoCollection) {
    if (!activityPubSchemas.validate("OrderedCollection.json", orderedCollection))
        throw new Meteor.Error('Invalid OrderedCollection', 'Cannot insert OrderedCollection: Schema not valid:' + activityPubSchemas.errorsText());

    if (mongoCollection.findOne({id: orderedCollection.id}))
        throw new Meteor.Error('Duplicate OrderedCollection', 'Cannot insert OrderedCollection: OrderedCollection with that id already present.');
};

FollowerLists.before.insert(function(userId, orderedCollection) {
    validateOrderedCollection(orderedCollection, FollowerLists);
});

FollowingLists.before.insert(function(userId, orderedCollection) {
    validateOrderedCollection(orderedCollection, FollowingLists);
});

if (Meteor.isServer) {

    this.Inboxes = new Mongo.Collection('inboxes');
    this.Outboxes = new Mongo.Collection('outboxes');

    Inboxes.before.insert(function(userId, orderedCollection) {
        validateOrderedCollection(orderedCollection, Inboxes);
    });

    Outboxes.before.insert(function(userId, orderedCollection) {
        validateOrderedCollection(orderedCollection, Outboxes);
    });


    Meteor.startup(function() {
        Inboxes._ensureIndex({id: 1});
        Outboxes._ensureIndex({id: 1});
        FollowerLists._ensureIndex({id: 1});
        FollowingLists._ensureIndex({id: 1});
    });
}
