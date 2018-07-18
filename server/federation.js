
import webfinger from '../lib/webfinger/lib/webfinger.js';

const dispatchToActor = function(actor, activity) {
    HTTP.post(actor.inbox, {data: activity, npmRequestOptions: {
        httpSignature: {
            authorizationHeaderName: "Signature",
            keyId: activity.actor + "#main-key",
            key: Keys.findOne({id: activity.actor + "#main-key"}, {fields: {privateKeyPem: 1}}).privateKeyPem
        }
    }}, function(err, result) {
        if (err) console.log("Error: ", err);
        if (result) console.log("Result: ", result);
    });
};

dispatchActivity = function(activity) {

    activity = cleanActivityPub(activity);

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
};

const checkFederatedActivityPermitted = function(activity) {

    //TODO: Check to see if foreign instances are blocked or banned.

    const actor = Actors.findOne({id: activity.actor});

    //I think theres some kind of race condition going on here, where it won't
    //have finished importing the actor by the time it gets to this code and so it throws an error?

    //I tried to ensure it would have to have finished by the time it gets here, but it seems like I didn't quite manage.
    if (!actor)
        throw new Meteor.Error('Actor Not Found', 'No actor with the given ID could be found in the database: ' + activity.actor);

    switch(activity.type) {

        //Users can follow without being verified. Thus, return here, instead of further down after the verification check.
        case 'Follow':
        case 'Undo':
            return;

        case 'Update':
        case 'Delete':

            checkUpdateOrDeleteActivityPermitted(activity);

        //No break here, as update and delete activities should be subject to the same restrictions as create and announce.
        case 'Create':

        if (Posts.findOne({id: activity.object.id}))
            throw new Meteor.Error('Post Already Exists', 'Cannot insert post, id already exists.');

        case 'Announce':
    }

    //TODO: Check to see if foreign actors are blocked or banned.
};

const processFederatedFollowActivity = function(activity) {
    const followee = Actors.findOne({id: activity.object});

    if (followee.local)
        FollowerLists.update({id: followee.followers}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.actor}});
};

const processFederatedCreateActivity = function(activity) {
    const post = getObjectFromActivity(activity);

    if (Posts.findOne({id: post.id}))
        throw new Meteor.Error('Post Already Exists', 'Cannot insert post, id already exists: ' + JSON.stringify({prev: Posts.findOne({id: post.id}), post: post}));

    post.local = false;
    Posts.insert(post);

    return activity;
};

const processFederatedDeleteActivity = function(activity) {
    const postID = activity.object;

    deletePost(postID);

    return activity;
};

const processFederatedAcceptActivity = function(activity) {

    let follower;

    switch (typeof activity.object) {
        case 'string':
            follower = Actors.findOne({id: activity.object});
            break;
        case 'object':
            follower = Actors.findOne({id: activity.object.actor});
            break;
    }

    if (!follower)
        throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + JSON.stringify(activity.object));

    const followee = Actors.findOne({id: activity.actor});

    let pendingFollow = PendingFollows.findOne({follower: follower.id, followee: followee.id});

    if (!pendingFollow)
        throw new Meteor.Error('No Follow Pending!', 'No pending follow between those actors was found: ' + activity.object + ", " + activity.actor);

    FollowingLists.update({id: follower.following}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.actor}});

    if (followee.local)
        FollowerLists.update({id: followee.followers}, {$inc: {totalItems: 1}, $push: {orderedItems: activity.object}});

    PendingFollows.remove(pendingFollow);

    return activity;
};

const processFederatedUndoActivity = function(activity) {

    let targetActivity = Activities.findOne({id: activity.object});

    if (targetActivity.type === "Follow"){

        const follower = Actors.findOne({id: targetActivity.actor});

        if (!follower)
            throw new Meteor.Error('Actor not found!', 'No actor with the given ID could be found: ' + targetActivity.object);

        const followee = Actors.findOne({id: targetActivity.actor});

        FollowingLists.update({id: follower.following}, {$inc: {totalItems: -1}, $pull: {orderedItems: targetActivity.actor}});

        if (followee.local)
            FollowerLists.update({id: followee.followers}, {$inc: {totalItems: -1}, $pull: {orderedItems: targetActivity.object}});

        PendingFollows.remove({follower: follower.id, followee: followee.id});

        return activity;
    }
};

const processFederatedActivity = function(activity) {

    if (activity.id && Activities.findOne({id: activity.id}))
        return;

    let processFederatedActivityCallback = function() {
        try {
            checkFederatedActivityPermitted(activity);
        } catch (error) {
            if (['Post Not Present', 'Post Already Exists'].includes(error.error)) {
                const _id = Activities.insert(activity);

                return Activities.findOne({_id: _id});
            } else throw error;
        }

        switch(activity.type) {
            case 'Create':
                try {
                    activity = processFederatedCreateActivity(activity);
                } catch (error) {
                    throw error;
                }
                break;
            case 'Delete':
            try {
                activity = processFederatedDeleteActivity(activity);
            } catch (error) {
                if (error.error === 'Post Not Present') {

                } else throw error;
            }
                break;
            case "Accept":
                activity = processFederatedAcceptActivity(activity);
                break;
        }

        Activities.insert(activity);
    }

    if (activity.actor && !Actors.findOne({id: activity.actor})) { //Is this posts actor already present? If not,
        importActivityJSONFromUrl(activity.actor, processFederatedActivityCallback); //add it, and finish the function as a callback.
    } else {
        processFederatedActivityCallback(); //If it is present, then continue as normal.
    }
};

const importActorFromActivityPubJSON = function(json) {
    if (!Actors.findOne({id: json.id})) { //Is actor already present? If not,
        json.local = false; //mark it as foreign,
        Actors.insert(json); //then add it.

        console.log("Added Actor: " + json.id);
    }
};

const importPostFromActivityPubJSON = function(json) {
    if (!Posts.findOne({id: json.id})) { //Is post already present? If not,
        json.local = false; //mark it as foreign,
        Posts.insert(json); //then add it.
    }
};

importActivityJSONFromUrl = function(url, callback) {
    console.log("Importing from: " + url);

    return getActivityFromUrl(url)
    .then((response) => {
        if (response) {
            return response.json();
        } else throw new Meteor.Error('No response from url');
    })
    .then((json) => {
        importFromActivityPubJSON(json);

        if (callback) callback(json);
        return json;
    }).catch((err) => { console.log(err); });
};

importFromActivityPubJSON = function(json) {
    if (!json) throw new Meteor.Error('Empty JSON');

    if (!json.type) throw new Meteor.Error('Untyped ActivityPub JSON');

    if (activityPubActorTypes.includes(json.type))
        importActorFromActivityPubJSON(json);

    else if (activityPubContentTypes.includes(json.type))
        importPostFromActivityPubJSON(json);
};

Meteor.methods({
    importActivityJSONFromUrl: importActivityJSONFromUrl,
    importFromActivityPubJSON: importFromActivityPubJSON,
    postActivity: function(object) {
        const user = Meteor.users.findOne({_id: this.userId});

        let result = processClientActivity(user, object);

        return result;
    }
});

const successfulJSON = function(data) {
    response = {
        statusCode: 200
    };

    if (data) {
        response.body = cleanActivityPub(data);
    }

    return response;
};

const failedJSON = function(message) {
    return {
        statusCode: 400,
        body: {status: "fail", message: message}
    };
};

Api = new Restivus({
    apiPath: '/',
    prettyJson: true
});

Api.addRoute('.well-known/host-meta', {}, {
    get: {
        action: function () {
            let response = successfulJSON();
            response.headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/xml; charset=UTF-8'
            };

            response.body = '<XRD>' +
                            '  <Link rel="lrdd"' +
                            '    type="application/xrd+xml"' +
                            '    template="' +
                            process.env.ROOT_URL + '/webfinger/xrd/{uri}" />' +
                            '</XRD>'

            return response;
        }
    }
});

Api.addRoute('.well-known/host-meta.json', {}, {
    get: {
        action: function () {
            let response = successfulJSON();
            response.headers = {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json; charset=UTF-8'
            };

            response.body = {
                links: [
                    {
                        "rel": "lrdd",
                        "type": "application/json",
                        "template": process.env.ROOT_URL + "/.well-known/webfinger?resource={uri}"
                    }
                ]
            }

            return response;
        }
    }
});

Api.addRoute('.well-known/webfinger', {}, {
    get: {
        action: function () {

            let resource = this.queryParams.resource;
            var re = /(acct:@?)(.*)(@.*)/;
            let handle = resource.replace(re, "$2");
            let actor = Actors.findOne({preferredUsername: handle, local: true});

            actor = cleanActivityPub(actor);

            let response = successfulJSON();

            response.headers = {
                'Content-Type': 'application/json; charset=UTF-8'
            };

            response.body = {
                subject: resource,
                aliases: [actor.url, actor.id],
                links: [
                    {
                        "rel":"http://webfinger.net/rel/profile-page",
                        "type":"text/html",
                        "href": actor.url
                    },
                    {
                        "rel":"self",
                        "type":"application/activity+json",
                        "href": actor.id
                    }
                ]
            }

            return response;
        }
    }
});

Api.addRoute('post/:_id', {}, {
    get: {
        action: function () {
            let post = Posts.findOne({_id: this.urlParams._id});
            if (post) {
                let response = successfulJSON(post);
                response.headers = {
                    'Content-Type': 'activity/json; charset=UTF-8'
                };
                return response;
            } else return failedJSON("Unable to get post!");
        }
    }
});

Api.addRoute('activity/:_id', {}, {
    get: {
        action: function () {
            let activity = Activities.findOne({_id: this.urlParams._id});
            if (activity) {
                let response = successfulJSON(activity);
                response.headers = {
                    'Content-Type': 'activity/json; charset=UTF-8'
                };
                return response;
            } else return failedJSON("Unable to get post!");
        }
    }
});

Api.addRoute('actors/:handle', {}, {
    get: {
        action: function () {
            let actor = Actors.findOne({preferredUsername: this.urlParams.handle, local: true});
            if (actor) {
                let response = successfulJSON(actor);
                response.headers = {
                    'Content-Type': 'activity/json; charset=UTF-8'
                };
                return response;
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
                let orderedItems = [];
                for (let i = 0; i < outbox.totalItems && i < 10; i++) {
                    orderedItems.push(Activities.findOne({id: outbox.orderedItems[i]}));
                }
                outbox.orderedItems = orderedItems;
                let response = successfulJSON(outbox);
                response.headers = {
                    'Content-Type': 'activity/json; charset=UTF-8'
                };
                return response;
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
            let following = FollowingLists.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/following"});
            if (following) {
                let response = successfulJSON(following);
                response.headers = {
                    'Content-Type': 'activity/json; charset=UTF-8'
                };
                return response;
            } else return failedJSON("Unable to get following list!");
        }
    }
});

Api.addRoute('actors/:handle/followers', {}, {
    get: {
        action: function () {
            let actor = Actors.findOne({preferredUsername: this.urlParams.handle});
            if (actor) {
                let followers = FollowerLists.findOne({id: actor.followers});
                if (followers) {
                    return successfulJSON(followers);
                }
            }

            return failedJSON("Unable to get followers list!");
        }
    }
});
