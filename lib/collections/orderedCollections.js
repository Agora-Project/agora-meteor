this.Inboxes = new Mongo.Collection('inboxes');
this.Outboxes = new Mongo.Collection('outboxes');
this.FollowerLists = new Mongo.Collection('followerlists');
this.FollowingLists = new Mongo.Collection('followinglists');

let validateOrderedCollection = function(orderedCollection, mongoCollection) {
    if (!activityPubSchemas.validate("OrderedCollection.json", orderedCollection))
        throw new Meteor.Error('Invalid OrderedCollection', 'Cannot insert OrderedCollection: Schema not valid:' + activityPubSchemas.errorsText());

    if (mongoCollection.findOne({id: orderedCollection.id}))
        throw new Meteor.Error('Duplicate OrderedCollection', 'Cannot insert OrderedCollection: OrderedCollection with that id already present.');
};

Inboxes.before.insert(function(userId, orderedCollection) {
    validateOrderedCollection(orderedCollection, Inboxes);
});

Outboxes.before.insert(function(userId, orderedCollection) {
    validateOrderedCollection(orderedCollection, Outboxes);
});

FollowerLists.before.insert(function(userId, orderedCollection) {
    validateOrderedCollection(orderedCollection, FollowerLists);
});

FollowingLists.before.insert(function(userId, orderedCollection) {
    validateOrderedCollection(orderedCollection, FollowingLists);
});


let orderedCollection = {
    id: "https://anticapitalist.party/users/Angle/outbox",
    type: "OrderedCollection",
    totalItems: 0,
    orderedItems: []
};

Outboxes.remove({});

Outboxes.insert(orderedCollection);
