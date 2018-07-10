/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Activities = new Mongo.Collection('activities');

this.Activities.before.insert(function(userId, activity) {
    if (!activityPubActivityTypes.includes(activity.type))
        throw new Meteor.Error('Not an Activity', 'Cannot insert document into Activities Collection: Not an Activity.');

    //if (!activityPubSchemas.validate("Activity.json", activity))
        //throw new Meteor.Error('Invalid Activity', 'Cannot insert Activity: Schema not valid:' + activityPubSchemas.errorsText());

    if (activity.id && Activities.findOne({id: activity.id}))
        throw new Meteor.Error('Duplicate Activity', 'Cannot insert Activity: Activity with that id already present.');

    if (!activity.id) activity.id = process.env.ROOT_URL + "activity/" + activity._id;
});


this.Activities.after.insert(function(userId, activity) {
    if (activity.local && (activity.type === "Create" || activity.type === "Announce")) {
        let actor = Actors.findOne({id: activity.actor});
        Outboxes.update({id: actor.outbox}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.id}});
    }
});

if (Meteor.isServer) {
    Meteor.startup(function() {
        Activities._ensureIndex({id: 1});
    });
}
