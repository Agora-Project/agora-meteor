this.FollowerLists = new Mongo.Collection('followerlists');
this.FollowingLists = new Mongo.Collection('followinglists');

this.PendingFollows = new Mongo.Collection('pendingfollows');

let validateOrderedCollection = function(orderedCollection, mongoCollection) {
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
        PendingFollows._ensureIndex({follower: 1, followee: 1});
    });
}
