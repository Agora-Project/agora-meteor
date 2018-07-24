checkClientActivityUserPermissions = function(activity, user) {
    if (!user) {
        throw new Meteor.Error('Not-logged-in', 'The user must be logged in to perform activities.');
    }

    if (activity.actor !== user.actor)
        throw new Meteor.Error('Actor mismatch!', 'Method actor does not match activity actor!');

    if (!Actors.findOne({id: activity.actor}))
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found in the database: ' + activity.actor);

    return true;
};

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

    if (activityPubContentTypes.includes(object.type)) {
        const originalObject = Posts.findOne({id: object.id});

        if (!originalObject) throw new Meteor.Error('Post Not Present', "That post is not present in this forum: " + JSON.stringify(activity));

        //Don't allow non-moderators to edit other peoples posts.
        if (activity.actor !== originalObject.attributedTo && (!user || !Roles.userIsInRole(user._id, ['moderator']))) {
            throw new Meteor.Error('Post Not Owned', "Only moderators may edit or delete posts they don't own.");
        }
    } else if (activityPubActorTypes.includes(object.type)) {
        const originalActor = Actors.findOne({id: object.id});

        if (!originalActor) throw new Meteor.Error('Actor Not Present', "That actor is not present in this forum: " + JSON.stringify(activity));

        //Don't allow non-moderators to edit other peoples posts.
        if (activity.actor !== originalActor.id && (!user || !Roles.userIsInRole(user._id, ['moderator']))) {
            throw new Meteor.Error('Actor Not Owned', "Only moderators may edit or delete actors they don't own.");
        }
    }

    return true;
};

const checkUndoActivityPermitted = function (activity, user) {
    let targetActivity = Activities.findOne({id: activity.object});

    if (!targetActivity) {
        throw new Meteor.Error('Activity Not Found!', 'No activity with the given ID could be found in the database: ' + activity.object);
    }

    if (activity.actor !== targetActivity.actor) {
        throw new Meteor.Error('Activity Not Owned', "You can't undo other peoples activities.");
    }

    return true;
};

const checkClientActivityPermitted = function(activity, user) {

    checkClientActivityUserPermissions(activity, user);

    switch(activity.type) {

        case 'Undo':
            checkUndoActivityPermitted(activity, user);
        //Users can follow and unfollow without being verified. Thus, return here, instead of further down after the verification check.
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

const processPost = function(post) {
    post.content = post.source.content;
    post.summary = post.source.summary;
}

const processClientCreateActivity = function(activity) {
    let post = activity.object;

    //Don't allow posts with no content.
    if (!post.source.content || post.source.content.length < 1)
        throw new Meteor.Error('No content!', 'Cannot insert post without content!');

    //The constants below are from lib/collections/posts.js

    //Don't allow posts with too much content
    if (post.source.content.length > POST_CONTENT_CHARACTER_LIMIT)
        throw new Meteor.Error('Too much content!', 'Cannot insert post with content greater than ' + POST_CONTENT_CHARACTER_LIMIT + ' characters!');

    //Don't allow posts with summariesw that are too long.
    if (post.source.summary && post.source.summary.length > POST_SUMMARY_CHARACTER_LIMIT)
        throw new Meteor.Error('Summary too long!', 'Cannot insert post with summary greater than ' + POST_SUMMARY_CHARACTER_LIMIT + ' characters!');

    if (post.source.content.length > POST_CONTENT_SUMMARY_REQUIREMENT && (!post.source.summary || post.source.summary.length < 1))
        throw new Meteor.Error('Summary needed!', 'Posts with more than ' + POST_CONTENT_SUMMARY_REQUIREMENT + ' characters of content must have a summary!');

    //Don't allow posts that target posts that don't exist.
    if (post.inReplyTo && !Posts.findOne({id: post.inReplyTo}))
        throw new Meteor.Error('target invalid', 'Targeted post not found!');

    post.local = true;

    processPost(post);

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

    const follower = Actors.findOne({id: activity.actor});

    const followee = Actors.findOne({id: activity.object});

    if (!followee)
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + activity.object);

    if (FollowingLists.findOne({id: follower.following, orderedItems: followee.id}))
        throw new Meteor.Error('Already Following!', 'You are already following that actor!');

    if (!PendingFollows.findOne({follower: follower.id, followee: followee.id})) {
        PendingFollows.insert({follower: follower.id, followee: followee.id});
        //throw new Meteor.Error('Follow Already Pending!', 'A pending follow between those actors was already present!: ' + activity.actor + ", " + activity.object);
    }


    if (followee.local) {
        let accept = new ActivityPubActivity("Accept", followee.id, activity.actor);
        accept.to.push(activity.actor);
        Meteor.setTimeout(function(){
            dispatchActivity(accept);
        }, 0);
    }

    return activity;
};

const processClientUndoActivity = function(activity) {

    let targetActivity = Activities.findOne({id: activity.object});

    if (targetActivity.type === "Follow") {

        const follower = Actors.findOne({id: targetActivity.actor});

        const followee = Actors.findOne({id: targetActivity.object});

        if (!followee)
            throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + targetActivity.object);

        FollowingLists.update({id: follower.following}, {$inc: {totalItems: -1}, $pull: {orderedItems: targetActivity.object}});

        if (followee.local)
            FollowerLists.update({id: followee.followers}, {$inc: {totalItems: -1}, $pull: {orderedItems: targetActivity.actor}});

        PendingFollows.remove({follower: follower.id, followee: followee.id});

        return activity;
    }
};

const encapsulateContentWithCreate = function(post) {

    let activity = new ActivityPubActivity("Create", post.attributedTo, post);
    activity.published = post.published;

    return activity;
};

cleanActivityPub = function(object) {
    delete object._id;
    delete object.local;

    if (!object['@context']) object['@context'] = "https://www.w3.org/ns/activitystreams";

    if (object.object && typeof object.object === 'object') {
        cleanActivityPub(object.object);
    }

    if (object.orderedItems) {
        for (let i = 0; i < object.orderedItems.length; i++) {
            object.orderedItems[i] = cleanActivityPub(object.orderedItems[i]);
        }
    }

    return object;
};

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

    activity.local = true;

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
        case 'Undo':
            activity = processClientUndoActivity(activity);
            break;
    }

    let _id = Activities.insert(activity);
    activity = Activities.findOne({_id: _id});

    //The setTimeout here is to make the dispatch happen as a separate process, so
    //it doesn't interfere with the rest of the function if it encounters an error.
    Meteor.setTimeout(function() {
         dispatchActivity(Activities.findOne({_id: _id}));
    }, 0);

    return activity;
};
