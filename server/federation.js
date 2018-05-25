
//import webfinger from '../lib/webfinger/lib/webfinger.js';

let processCreateActivity = function(activity) {
    let post = activity.object;

    let post_ID = Posts.insert(post);
    activity.object = Posts.findOne({_id: post_ID});

    return post_ID;
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

    return {
        '@context': "https://www.w3.org/ns/activitystreams",
        type: "Create",
        object: post,
        actor: post.attributedTo,
        published: post.published,
        to: post.to,
        cc: post.cc
    };
}

let processClientActivity = function(object) {

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
