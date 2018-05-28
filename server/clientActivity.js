let checkClientActivityPermitted = function(user, activity) {
    if (!user) {
        throw new Meteor.Error('Not-logged-in', 'The user must be logged in to perform activities.');
    }

    if (activity.actor != user.actor)
        throw new Meteor.Error('Actor mismatch!', 'Method actor does not match activity actor!');

    if (!Actors.findOne({id: activity.actor}))
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found in the database: ' + followerID);

    switch(activity.type) {

        //Users can follow without being verified. Thus, return here, instead of further down after the verification check.
        case 'Follow':
            return;

        case 'Update':
        case 'Delete':
            //Don't allow non-moderators to edit other peoples posts.
            if (activity.actor !== user.actor && !Roles.userIsInRole(user._id, ['moderator'])) {
                throw new Meteor.Error('Post Not Owned', "Only moderators may edit or delete posts they don't own.");
            }

        //No break here, as update and delete activities should be subject to the same restrictions as create and announce.
        case 'Create':
        case 'Announce':
            //Don't allow banned users to post or announce.
            if (user.isBanned) {
                throw new Meteor.Error('Banned', 'Banned users may not perform that activity.');
            }
            break;

    }

    //Don't allow unverified users to manipulate the forum. They can still follow people though,
    //which is why follows return above and don't execute this code.
    if (!user.emails || user.emails.length < 1 || !user.emails[0].verified) {
        throw new Meteor.Error('Unverified', 'Unverified users may not perform that activity.');
    }
};

let processClientCreateActivity = function(activity) {
    let post = activity.object;

    post.local = true;

    let post_ID = Posts.insert(post);
    activity.object = Posts.findOne({_id: post_ID});

    return activity;
};

let processClientDeleteActivity = function(activity) {
    let postID = activity.object;

    deletePost(postID);

    return activity;
};

let processClientUpdateActivity = function(activity) {
    let update = activity.object;

    Posts.update({id: update.id}, {$set: update});

    return activity;
};

let processClientFollowActivity = function(activity) {

    if (!actors.findOne({id: activity.object}))
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + activity.object);

    let follower = actors.findOne({id: activity.actor});

    FollowingLists.update({id: follower.following}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.object}});

    return activity;
};

let encapsulateContentWithCreate = function(post) {

    //Don't allow posts with no content.
    if (!post.content || post.content.length < 1)
        throw new Meteor.Error('No content!', 'Cannot insert post without content!');

    //Don't allow posts with too much content
    if (post.content.length > 100000)
        throw new Meteor.Error('Too much content!', 'Cannot insert post with content greater than 100,000 characters!');

    //Don't allow posts with summariesw that are too long.
    if (post.summary && post.summary.length > 100)
        throw new Meteor.Error('Summary too long!', 'Cannot insert post with summary greater than 100 characters!');

    if (post.content.length > 500 && (!post.summary || post.summary.length < 1))
        throw new Meteor.Error('Summary needed!', 'Posts with more than 500 characters of content must have a summary!');

    //Don't allow posts that target posts that don't exist.
    if (post.inReplyTo && !Posts.findOne({id: post.inReplyTo}))
        throw new Meteor.Error('target invalid', 'Targeted post not found!');

    let activity = new ActivityPubActivity("Create", post.attributedTo, post);
    activity.published = post.published;

    return activity;
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

    checkClientActivityPermitted(user, activity);

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

    return activity;
};
