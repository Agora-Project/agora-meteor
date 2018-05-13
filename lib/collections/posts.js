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
    id: {
        type: String,
        regEx: SimpleSchema.RegEx.Url,
        optional: true
    },
    url: {
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
        regEx: SimpleSchema.RegEx.Id,
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
        regEx: SimpleSchema.RegEx.Id,
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

this.Posts.attachSchema(this.Schema.Post);

this.Posts.before.insert(function(userId, post) {
    if (!post.attributedTo && userId) post.attributedTo = Meteor.users.findOne({_id: userId}).actor;

    let actor = Actors.findOne({id: post.attributedTo});

    if (!post.published) post.published = Date.now();
    if (!post.id) post.id = process.env.ROOT_URL + "post/" + post._id;
    if (!post.url) post.url = actor.url + "/" + post._id;
});
