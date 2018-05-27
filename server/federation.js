
//import webfinger from '../lib/webfinger/lib/webfinger.js';

let processFederatedFollowActivity = function(activity) {
    let followee = actors.findOne({id: activity.object});

    FollowerLists.update({id: followee.followers}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.actor}});
}

let dispatchActivity = function(activity) {
    let targetArrays = ['to', 'cc', 'bto', 'bcc', 'audience'];

    for (let i = 0; i < targetArrays.length; i++) {
        let arrayName = targetArrays[i];
        let targetArray = activity[arrayName];
        for (let j = 0; j < targetArray.length; j++) {
            let actor = Actors.findOne({id: targetArray[j]});
            if (actor)
                HTTP.post(actor.inbox, {data: activity});
        }
    }
}

let processFederatedActivity = function(activity) {
    console.log(activity);

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

        dispatchActivity(result);

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
