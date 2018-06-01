checkClientActivityUserPermissions = function(activity, user) {
    if (!user) {
        throw new Meteor.Error('Not-logged-in', 'The user must be logged in to perform activities.');
    }

    if (activity.actor != user.actor)
        throw new Meteor.Error('Actor mismatch!', 'Method actor does not match activity actor!');

    if (!Actors.findOne({id: activity.actor}))
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found in the database: ' + activity.actor);

    return true;
}

getObjectFromActivity = function(activity) {
    switch (typeof activity.object) {
        case 'string':
            return Posts.findOne({id: activity.object});
            break;
        case 'object':
            return activity.object
            break;
    }
};

checkUpdateOrDeleteActivityPermitted = function(activity, user) {
    const object = getObjectFromActivity(activity);

    const originalObject = Posts.findOne({id: object.id});

    //Don't allow non-moderators to edit other peoples posts.
    if (activity.actor !== originalObject.attributedTo && (!user || !Roles.userIsInRole(user._id, ['moderator']))) {
        throw new Meteor.Error('Post Not Owned', "Only moderators may edit or delete posts they don't own.");
    }
    return true;
};

const checkClientActivityPermitted = function(activity, user) {

    checkClientActivityUserPermissions(activity, user);

    switch(activity.type) {

        //Users can follow without being verified. Thus, return here, instead of further down after the verification check.
        case 'Follow':
            return;
            //No break here, as return accomplishes the same thing.
        case 'Update':
        case 'Delete':
            checkUpdateOrDeleteActivityPermitted(activity, user);

        //No break here, as update and delete activities should be subject to the same restrictions as create and announce.
        case 'Create':
        case 'Announce':
            //Don't allow banned users to post or announce.
            if (checkUserBanned(user)) {
                throw new Meteor.Error('Banned', 'Banned users may not perform that activity.');
            }
            break;
    }

    //Don't allow unverified users to manipulate the forum. They can still follow people though,
    //which is why follows return above and don't execute this code.
    if(!checkUserVerified(user))
        throw new Meteor.Error('Unverified', 'Unverified users may not perform that activity.');

    return true;
};

const processClientCreateActivity = function(activity) {
    let post = activity.object;

    post.local = true;

    let post_ID = Posts.insert(post);
    activity.object = Posts.findOne({_id: post_ID});

    delete activity.object.local;

    return activity;
};

const processClientDeleteActivity = function(activity) {
    const postID = activity.object;

    deletePost(postID);

    return activity;
};

const processClientUpdateActivity = function(activity) {
    let update = activity.object;

    Posts.update({id: update.id}, {$set: update});

    return activity;
};

const processClientFollowActivity = function(activity) {

    if (!actors.findOne({id: activity.object}))
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + activity.object);

    const follower = actors.findOne({id: activity.actor});

    FollowingLists.update({id: follower.following}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.object}});

    const followee = actors.findOne({id: activity.object});

    if (followee.local)
        FollowerLists.update({id: followee.followers}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.actor}});

    return activity;
};

const encapsulateContentWithCreate = function(post) {

    //Don't allow posts with no content.
    if (!post.content || post.content.length < 1)
        throw new Meteor.Error('No content!', 'Cannot insert post without content!');

    //The constants below are from lib/collections/posts.js

    //Don't allow posts with too much content
    if (post.content.length > POST_CONTENT_CHARACTER_LIMIT)
        throw new Meteor.Error('Too much content!', 'Cannot insert post with content greater than ' + POST_CONTENT_CHARACTER_LIMIT + ' characters!');

    //Don't allow posts with summariesw that are too long.
    if (post.summary && post.summary.length > POST_SUMMARY_CHARACTER_LIMIT)
        throw new Meteor.Error('Summary too long!', 'Cannot insert post with summary greater than ' + POST_SUMMARY_CHARACTER_LIMIT + ' characters!');

    if (post.content.length > POST_CONTENT_SUMMARY_REQUIREMENT && (!post.summary || post.summary.length < 1))
        throw new Meteor.Error('Summary needed!', 'Posts with more than ' + POST_CONTENT_SUMMARY_REQUIREMENT + ' characters of content must have a summary!');

    //Don't allow posts that target posts that don't exist.
    if (post.inReplyTo && !Posts.findOne({id: post.inReplyTo}))
        throw new Meteor.Error('target invalid', 'Targeted post not found!');

    let activity = new ActivityPubActivity("Create", post.attributedTo, post);
    activity.published = post.published;

    return activity;
}

const dispatchToActor = function(actor, activity) {
    HTTP.post(actor.inbox, {data: activity}, function(err, result) {
        //if (err) console.log("Error: ", err);
        //if (result) console.log("Result: ", result);
    });
}

cleanActivityPub = function(object) {
    delete object._id;
    delete object.local;
    if (object.object && typeof object.object === 'object') {
        delete object.object._id;
        delete object.object.local;
    }

    return object;
}

const dispatchActivity = function(activityID) {

    activity = cleanActivityPub(Activities.findOne({id: activityID}));

    const targetArrays = ['to', 'cc', 'bto', 'bcc', 'audience'];

    for (let i = 0; i < targetArrays.length; i++) {
        const arrayName = targetArrays[i];
        const targetArray = activity[arrayName];
        for (let j = 0; j < targetArray.length; j++) {
            const targetID = targetArray[j];
            if (targetID === "https://www.w3.org/ns/activitystreams#Public")
                continue;
            let actor = Actors.findOne({id: targetID});
            if (actor)
                dispatchToActor(actor, activity);
            else {
                const list = FollowerLists.findOne({id: targetID});
                if (list)
                    for (let actorID in list.orderedItems) {
                        actor = Actors.findOne({id: actorID});
                        if (actor)
                            dispatchToActor(actor, activity);
                    }
            }
        }
    }
}

processClientActivity = function(user, object) {

    //Set the object as being published right now.
    object.published = new Date().toISOString();

    let activity;
    //We may or may not have an activity to work with here.
    if (!activityPubActivityTypes.includes(object.type)) {

        //If we don't and it's a content object, encapsulate the object in a create activity.
        if (activityPubContentTypes.includes(object.type))
            activity = encapsulateContentWithCreate(object);

        //If we don't, and we don't know what it is, throw an error.
        else throw new Meteor.Error('Unknown type!', 'Cannot handle that type of object!');
    } else {
        //If we do have an activity, proceed normally.
        activity = object;
    }

    checkClientActivityPermitted(activity, user);

    switch(activity.type){
        case 'Create':
            activity = processClientCreateActivity(activity);
            break;
        case 'Delete':
            activity = processClientDeleteActivity(activity);
            break;
        case 'Follow':
            activity = processClientFollowActivity(activity);
            break;
        case 'Update':
            activity = processClientUpdateActivity(activity);
            break;
    }

    let _id = Activities.insert(activity);
    activity = Activities.findOne({_id: _id});

    Meteor.setTimeout(function(){
         dispatchActivity(activity.id)
    }, 0);

    return activity;
};
