
//import webfinger from '../lib/webfinger/lib/webfinger.js';

let checkActivityPermitted = function(user, activity) {
    if (!user) {
        throw new Meteor.Error('Not-logged-in', 'The user must be logged in to perform activities.');
    }

    if (activity.actor != user.actor)
        throw new Meteor.Error('Actor mismatch!', 'Method actor does not match activity actor!');

    if (!actors.findOne({id: activity.actor}))
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found in the database: ' + followerID);


    switch(activity.type) {
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

        //Users can follow without being verified. Thus, return here, instead of further down after the verification check.
        case 'Follow':
            let target = actors.findOne({id: activity.object});

            if (!target)
                throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + activity.object);
            return;

    }

    //Don't allow unverified users to manipulate the forum. They can still follow people though.
    if (!user.emails || user.emails.length < 1 || !user.emails[0].verified) {
        throw new Meteor.Error('Unverified', 'Unverified users may not perform that activity.');
    }
};

let processCreateActivity = function(activity) {
    let post = activity.object;

    let post_ID = Posts.insert(post);
    activity.object = Posts.findOne({_id: post_ID});

    return post_ID;
};

let processDeleteActivity = function(activity) {
    let postID = activity.object;

    deletePost(postID);
};

let processUpdateActivity = function(activity) {
    let update = activity.object;

    Posts.update({id: update.id}, {$set: update});
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
    if (post.inReplyTo) {
        let target = Posts.findOne({id: post.inReplyTo});
        if (!target) {
            throw new Meteor.Error('target invalid', 'Targeted post not found!');
        }
    }

    post.local = true;
    let activity = new ActivityPubActivity("Create", post.attributedTo, post);
    return activity;
}

let processClientActivity = function(user, object) {


    //Set the activity as being published right now.
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

    checkActivityPermitted(user, activity);

    let result;

    switch(activity.type){
        case 'Create':
            result = processCreateActivity(activity);
            break;
        case 'Delete':
            result = processDeleteActivity(activity);
            break;
        case 'Follow':
            result = processFollowActivity(activity);
            break;
        case 'Update':
            result = processUpdateActivity(activity);
            break;
    }

    return result;
};

let importActorFromActivityPubJSON = function(json) {
    if (!Actors.findOne({id: json.id})) { //Is actor already present? If not,
        json.local = false; //mark it as foreign,
        Actors.insert(json); //then add it.
    }
};

let importPostFromActivityPubJSON = function(json) {
    if (!Posts.findOne({id: json.id})) { //Is post already present? If not,
        json.local = false; //mark it as foreign,
        Posts.insert(json); //then add it.
    }
};

Meteor.methods({
    getActivityJSONFromUrl: function(url) {
        return getActivityFromUrl(url)
        .then((response) => {
            if (response) {
                return response.json();
            } else throw new Meteor.Error('No response from url');
        })
        .then((json) => {
            if (json) Meteor.call('importFromActivityPubJSON', json);

            return json;
        });
    },
    importFromActivityPubJSON: function(json) {
        if (!json) throw new Meteor.Error('Empty JSON');

        if (!json.type) throw new Meteor.Error('Untyped ActivityPub JSON');

        if (activityPubActorTypes.includes(json.type))
            importActorFromActivityPubJSON(json);

        else if (activityPubContentTypes.includes(json.type))
            importPostFromActivityPubJSON(json);
    },
    postActivity: function(object) {

        let user = Meteor.users.findOne({_id: this.userId});

        return processClientActivity(user, object);
    }
});

let successfulJSON = function(data) {
    response = {
        statusCode: 200
    };

    if (data) {
        delete data._id;
        delete data.local;
        response.body = data;
    }

    return response;
}

let failedJSON = function(message) {
    return {
        statusCode: 400,
        body: {status: "fail", message: message}
    };
}

Api = new Restivus({
    apiPath: '/',
    prettyJson: true
});

Api.addRoute('post/:_id', {}, {
    get: {
        action: function () {
            var post = Posts.findOne({_id: this.urlParams._id});
            if (post) {
                delete post._id;
                return successfulJSON(post);
            } else return failedJSON("Unable to get post!");
        }
    }
});

Api.addRoute('actors/:handle', {}, {
    get: {
        action: function () {
            var actor = Actors.findOne({preferredUsername: this.urlParams.handle});
            if (actor) {
                return successfulJSON(actor);
            } else return failedJSON("Unable to get actor!");
        }
    }
});

Api.addRoute('actors/:handle/inbox', {}, {
    post: {
        action: function () {
        }
    }
});

Api.addRoute('actors/:handle/outbox', {}, {
    get: {
        action: function () {
            var outbox = Outboxes.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/outbox"});
            if (outbox) {
                return successfulJSON(outbox);
            } else return failedJSON("Unable to get outbox!");
        }
    },
    post: {
        action: function () {
            let object = this.request.body;

            try {
                return successfulJSON(processClientActivity(object));
            } catch (exception) {
                return failedJSON(exception.reason);
            }
        }
    }
});

Api.addRoute('actors/:handle/following', {}, {
    get: {
        action: function () {
            var following = FollowingLists.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/following"});
            if (following) {
                return successfulJSON(following);
            } else return failedJSON("Unable to get following list!");
        }
    }
});

Api.addRoute('actors/:handle/followers', {}, {
    get: {
        action: function () {
            var followers = FollowerLists.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/followers"});
            if (followers) {
                return successfulJSON(followers);
            } else return failedJSON("Unable to get followers list!");
        }
    }
});
