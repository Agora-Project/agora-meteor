
//import webfinger from '../lib/webfinger/lib/webfinger.js';


let checkFederatedActivityPermitted = function(activity) {

    let actor = Actors.findOne({id: activity.actor});

    if (actor.blocked)
        throw new Meteor.Error('Actor blocked!', 'That actor is blocked from this forum!');

    let object = getObjectFromActivity(activity);

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

let processFederatedFollowActivity = function(activity) {
    let followee = actors.findOne({id: activity.object});

    if (followee.local)
        FollowerLists.update({id: followee.followers}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.actor}});
}

let processFederatedCreateActivity = function(activity) {
    let post = getObjectFromActivity(activity);

    let post_ID = Posts.insert(post);
    activity.object = Posts.findOne({_id: post_ID}).id;

    return activity;
};

let processFederatedActivity = function(activity) {
    if (Activities.findOne({id: activity.id}))
        return

    switch(activity.type) {
        case 'Create':
            activity = processFederatedCreateActivity(activity);
            break;
        case 'Delete':
            activity = processFederatedCreateActivity(activity);
            break;
    }

    let _id = Activities.insert(activity);

    return Activities.findOne({_id: _id});
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

        let result = processClientActivity(user, object);

        return result;
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
            let object = this.request.body;
            processFederatedActivity(object);
            return successfulJSON();
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
                console.log(exception.reason);
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
