/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

POST_CONTENT_CHARACTER_LIMIT = 100000;
POST_SUMMARY_CHARACTER_LIMIT = 100;
POST_CONTENT_SUMMARY_REQUIREMENT = 500;

this.Posts = new Mongo.Collection('posts');

//TODO: Clean this up so that code for local post creation handling and code for fediverse import handling aren't tied together.
this.Posts.before.insert(function(userId, post) {

    if (post.id && Posts.findOne({id: post.id}))
        throw new Meteor.Error('Duplicate id!', 'Post with that id already exists!');

    if (post.local === undefined)
        throw new Meteor.Error('Post.local not set!', 'Post has been marked as neither local nor foreign!');

    if (post.local) {
        let actor = Actors.findOne({id: post.attributedTo});

        //If the post doesn't have an URL, assign it one based on it's actor.
        //This is intended for local posts only, not fediverse ones.
        if (actor) post.url = actor.url + "/" + post._id;

        //If the post doesn't have a fediverse id, assign it one based on it's local _id.
        //This is intended for local posts only, not fediverse ones.
        if (!post.id) post.id = process.env.ROOT_URL + "post/" + post._id;
    }

    //If the post doesn't have an array for replies, it gets an empty one.
    if (!post.replies) post.replies = [];
});

this.Posts.after.insert(function(userId, post) {
    if (post.inReplyTo) {
        if (!Posts.findOne({id: post.inReplyTo})) { //Is the post this replies to already present? If not,
            try {
                Meteor.call('importActivityJSONFromUrl', post.inReplyTo); //add it.
            } catch (error) {
                console.log(error, post.inReplyTo);
            }
        }

        Posts.update({id: post.inReplyTo}, {$push: {replies: post.id}});
    }

    if (post.attributedTo && !Actors.findOne({id: post.attributedTo})) { //Is this posts actor already present? If not,
        Meteor.call('importActivityJSONFromUrl', post.attributedTo); //add it.
    }
});

if (Meteor.isServer) {
    Meteor.startup(function() {
        Posts._ensureIndex({id: 1});
        Posts._ensureIndex({published: 1});
        Posts._ensureIndex({inReplyTo: 1});
    });
}
