/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

if(Meteor.isServer){
    NodeRSA = require('node-rsa');
}

this.Actors = new Mongo.Collection('actors');

this.Actors.before.insert(function(userId, actor) {

    if (!activityPubActorTypes.includes(actor.type))
        throw new Meteor.Error('Not an Actor', 'Cannot insert document into Actor Collection: Not an Actor.');

    if (actor.id && Actors.findOne({id: actor.id}, {noRecursion: true}))
        throw new Meteor.Error('Duplicate Actor', 'Cannot insert Actor: Actor with that id already present: ' + actor.id);

    const key = new NodeRSA({b: 2048});
    if (actor.local) {
        let publicKeyPem = key.exportKey('pkcs8-public-pem');

        actor.publicKey = {
            id: actor.id + "#main-key",
            owner: actor.id,
            publicKeyPem: publicKeyPem
        };

        Keys.insert({
            id: actor.id + "#main-key",
            owner: actor.id,
            publicKeyPem: publicKeyPem,
            privateKeyPem: key.exportKey('pkcs8-private-pem')
        });
    }
});

this.Actors.after.insert(function(userId, actor) {
    if (actor.local) {
        Inboxes.insert({
            id: actor.inbox,
            type: "OrderedCollection",
            totalItems: 0,
            orderedItems: []
        });

        Outboxes.insert({
            id: actor.outbox,
            type: "OrderedCollection",
            totalItems: 0,
            orderedItems: []
        });

        FollowingLists.insert({
            id: actor.following,
            type: "OrderedCollection",
            totalItems: 0,
            orderedItems: []
        });

        FollowerLists.insert({
            id: actor.followers,
            type: "OrderedCollection",
            totalItems: 0,
            orderedItems: []
        });
    }
});

this.Actors.before.findOne(function(userId, selector, options) {
    if ((!options || !options.noRecursion) && selector.id && !Actors.findOne({id: selector.id}, {noRecursion: true}))
        try {
            Meteor.call('getActivityJSONFromUrl', selector.id);
        } catch(exception) {

        }
});

if (Meteor.isServer) {
    Meteor.startup(function() {
        Actors._ensureIndex({id: 1});
        Actors._ensureIndex({preferredUsername: 1});
    });
}
