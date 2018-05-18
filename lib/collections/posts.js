/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Posts = new Mongo.Collection('posts');

//TODO: Clean this up so that code for local post creation handling and code for fediverse import handling aren't tied together.
this.Posts.before.insert(function(userId, post) {
    if (Posts.findOne({id: post.id}))
        throw new Meteor.Error('Duplicate id!', 'Post with that id already exists!');

    if (!post.attributedTo && userId) post.attributedTo = Meteor.users.findOne({_id: userId}).actor;

    if (post.attributedTo) {
        let actor = Actors.findOne({id: post.attributedTo});

        //If the post doesn't have an URL, assign it one based on it's actor.
        //This is intended for local posts only, not fediverse ones.
        if (!post.url && actor) post.url = actor.url + "/" + post._id;

        if (!actor) { //If the actor isn't present in the database,
            //Try to fetch it from the fediverse.
            Meteor.call('getActivityJSONFromUrl', post.attributedTo);
        }
    }

    //If the post doesn't say when it was published, it was published just now.
    //This is intended for local posts only, not fediverse ones.
    if (!post.published) post.published = Date.now();

    //If the post doesn't have a fediverse id, assign it one based on it's local _id.
    //This is intended for local posts only, not fediverse ones.
    if (!post.id) post.id = process.env.ROOT_URL + "post/" + post._id;

    //If the post doesn't have a type, it's a Note.
    //This is intended for local posts only, not fediverse ones.
    if (!post.type) post.type = "Note";

    //If the post doesn't have an array for replies, it gets an empty one.
    //This is intended for local posts only, not fediverse ones.
    if (!post.replies) post.replies = [];

    if (!activityPubSchemas.validate("Note.json", post))
        console.log('Post schema not valid:' + activityPubSchemas.errorsText());
});

this.Posts.after.insert(function(userId, post) {
    if (post.inReplyTo) {
        if (!Posts.findOne({id: post.inReplyTo})) { //Is the post this replies to already present? If not,
            Meteor.call('getActivityJSONFromUrl', post.inReplyTo); //add it.
        }

        Posts.update({id: post.inReplyTo}, {$push: {replies: post.id}});
    }
});

if (Meteor.isServer) {
    Meteor.startup(function() {
        Posts._ensureIndex({id: 1});
        Posts._ensureIndex({published: 1});
        Posts._ensureIndex({inReplyTo: 1});
    });
}
