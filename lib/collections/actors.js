/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Actors = new Mongo.Collection('actors');

this.Actors.before.insert(function(userId, actor) {
    if (!activityPubActorTypes.includes(actor.type))
        throw new Meteor.Error('Not an Actor', 'Cannot insert document into Actor Collection: Not an Actor.');

    if (!activityPubSchemas.validate("Actor.json", actor))
        throw new Meteor.Error('Invalid Actor', 'Cannot insert Actor: Schema not valid:' + activityPubSchemas.errorsText());
});

if (Meteor.isServer) {
    Meteor.startup(function() {
        Actors._ensureIndex({id: 1});
        Actors._ensureIndex({preferredUsername: 1});
    });
}
