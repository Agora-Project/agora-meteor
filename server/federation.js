
//import webfinger from '../lib/webfinger/lib/webfinger.js';

let importActorFromActivityPubJSON = function(json) {
    if (!Actors.findOne({id: json.id})) { //Is actor already present? If not,
        json.local = false; //mark it as foreign,
        Actors.insert(json); //then add it.
    }
};

let importPostFromActivityPubJSON = function(json) {
    if (!Posts.findOne({id: json.id})) { //Is post already present? If not,
        Posts.insert(json);                  //add the post.
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

        else if (activityPubObjectTypes.includes(json.type))
            importPostFromActivityPubJSON(json);
    }
});

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
                return {
                    statusCode: 200,
                    body: post
                };
            }
            return {
                statusCode: 400,
                body: {status: "fail", message: "Unable to get post!"}
            };
        }
    }
});

Api.addRoute('actors/:handle', {}, {
    get: {
        action: function () {
            var actor = Actors.findOne({preferredUsername: this.urlParams.handle});
            if (actor) {
                delete actor._id;
                delete actor.local;
                return {
                    statusCode: 200,
                    body: actor
                };
            }
            return {
                statusCode: 400,
                body: {status: "fail", message: "Unable to get actor!"}
            };
        }
    }
});

Api.addRoute('actors/:handle/inbox', {}, {
    post: {/*
        action: function () {
            console.log("???");
            var inbox = Inboxes.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/inbox"});
            if (inbox) {
                delete inbox._id;
                return inbox;
            }
            return {
                statusCode: 400,
                body: {status: "fail", message: "Unable to get actor!"}
            };
        }*/
    }
});

Api.addRoute('actors/:handle/outbox', {}, {
    get: {
        action: function () {
            var outbox = Outboxes.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/outbox"});
            if (outbox) {
                delete outbox._id;
                return {
                    statusCode: 200,
                    body: outbox
                };
            }
            return {
                statusCode: 400,
                body: {status: "fail", message: "Unable to get outbox!"}
            };
        }
    },
    post: {
        action: function () {

        }
    }
});

Api.addRoute('actors/:handle/following', {}, {
    get: {
        action: function () {
            var following = FollowingLists.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/following"});
            if (following) {
                delete following._id;
                return {
                    statusCode: 200,
                    body: following
                };
            }
            return {
                statusCode: 400,
                body: {status: "fail", message: "Unable to get following list!"}
            };
        }
    }
});

Api.addRoute('actors/:handle/followers', {}, {
    get: {
        action: function () {
            var followers = FollowerLists.findOne({id: process.env.ROOT_URL + "actors/" + this.urlParams.handle + "/followers"});
            if (followers) {
                delete followers._id;
                return {
                    statusCode: 200,
                    body: followers
                };
            }
            return {
                statusCode: 400,
                body: {status: "fail", message: "Unable to get followers list!"}
            };
        }
    }
});
