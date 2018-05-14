/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Posts = new Mongo.Collection('posts');

//TODO: Clean this up so that code for local post creation handling and code for fediverse import handling aren't tied together.
this.Posts.before.insert(function(userId, post) {

    //First, some validation.

    if (!post.content || content.length < 1)
        throw new Meteor.Error('No content!', 'Cannot insert post without content!');

    if (post.content.length > 100000)
        throw new Meteor.Error('Too much content!', 'Cannot insert post with content greater than 100,000 characters!');

    if (post.summary.length > 100)
        throw new Meteor.Error('Summary too long!', 'Cannot insert post with sumarry greater than 100 characters!');

    if (!post.attributedTo && userId) post.attributedTo = Meteor.users.findOne({_id: userId}).actor;

    if (post.attributedTo) {
        let actor = Actors.findOne({id: post.attributedTo});

        //If the post doesn't have an URL, assign it one based on it's actor.
        //This is intended for local posts only, not fediverse ones.
        if (!post.url && actor) post.url = actor.url + "/" + post._id;

        if (!actor) { //If the actor isn't present in the database,
            //Try to fetch it from the fediverse.
            Meteor.call('getActivityJSONFromUrl', json.attributedTo);
        }

    }

    //If the post doesn't say when it was published, it was published just now.
    //This is intended for local posts only, not fediverse ones.
    if (!post.published) post.published = Date.now();
    //If the post doesn't have a fediverse id, assign it one based on it's local _id.
    //This is intended for local posts only, not fediverse ones.
    if (!post.id) post.id = process.env.ROOT_URL + "post/" + post._id;
});

this.Posts.after.insert(function(userId, post) {
    if (!Posts.findOne({id: post.inReplyTo})) { //Is the post this replies to already present? If not,
        Meteor.call('getActivityJSONFromUrl', post.inReplyTo); //add it.
    }
});

if (Meteor.isServer) {
    Meteor.startup(function() {
        Posts._ensureIndex({id: 1});
        Posts._ensureIndex({published: 1});
        Posts._ensureIndex({inReplyTo: 1});
    });
}
