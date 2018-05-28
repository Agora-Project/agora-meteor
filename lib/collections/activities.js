/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Activities = new Mongo.Collection('ativities');

this.Activities.before.insert(function(userId, activity) {
    if (!activityPubActivityTypes.includes(activity.type))
        throw new Meteor.Error('Not an Activity', 'Cannot insert document into Activities Collection: Not an Activity.');

    //if (!activityPubSchemas.validate("Activity.json", activity))
        //throw new Meteor.Error('Invalid Activity', 'Cannot insert Activity: Schema not valid:' + activityPubSchemas.errorsText());

    if (Activities.findOne({id: activity.id}))
        throw new Meteor.Error('Duplicate Activity', 'Cannot insert Activity: Activity with that id already present.');

    if (!activity.id) activity.id = process.env.ROOT_URL + "activity/" + activity._id;
});
