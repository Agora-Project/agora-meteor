/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

import simplSchema from 'simpl-schema';

if (!this.Schema)
    this.Schema = {}; //If this.Schema hasn't been defined, make it an empty object.

this.Schema.Post = new SimpleSchema({ //The schema for posts.
    attributedTo: { //id to the Actor object that this post is attrubuted to.
        type: simplSchema.oneOf(String, Object, Array),
        regEx: SimpleSchema.RegEx.Url,
        blackbox: true,
        optional: true
    },
    id: { //This posts ActivityPub id. Different from the local database _id.
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        optional: true,
        index: 1
    },
    url: { //The web url to view this post.
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        optional: true
    },
    summary: { //A short description of this post.
        type: String,
        optional: true,
        max: 100
    },
    content: { //This posts main body of content
        type: String,
        min: 1,
        max: 100000
    },
    inReplyTo: { //The id for the post this post is in reply to.
        type: String,
        optional: true,
        index: 1
    },
    tag: { //The tags for this post. Not currently used.
        type: [String],
        regEx: /(^|\s)([a-z\d][\w-]*)/i,
        optional: true
    },
    replies: { //The ids for the posts that respond to this one.
        type: [String],
        defaultValue: [],
        optional: true
    },
    published: { //The date this post was published.
        type: Date,
        optional: true,
        index: 1
    },
    updated: { //The date this post was last updated.
        type: Date,
        optional: true
    }
});

this.Posts = new Mongo.Collection('posts');

//TODO: Clean this up so that code for local post creation handling and code for fediverse import handling aren't tied together.
this.Posts.before.insert(function(userId, post) {
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
