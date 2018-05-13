/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

import simplSchema from 'simpl-schema';

if (!this.Schema)
    this.Schema = {}; //If this.Schema hasn't been defined, make it an empty object.

this.Schema.Post = new SimpleSchema({ //The schema for posts.
    attributedTo: {
        type: simplSchema.oneOf(String, Object, Array),
        blackbox: true,
        optional: true
    },
    summary: {
        type: String,
        optional: true,
        max: 100
    },
    content: {
        type: String,
        min: 1,
        max: 100000
    },
    inReplyTo: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true,
        index: 1
    },
    tag: {
        type: [String],
        regEx: /(^|\s)([a-z\d][\w-]*)/i,
        optional: true
    },
    replies: {
        type: [String],
        regEx: SimpleSchema.RegEx.Id,
        defaultValue: [],
        optional: true
    },
    published: {
        type: Date,
        optional: true,
        index: 1
    },
    updated: {
        type: Date,
        optional: true
    }
});

this.Posts = new Mongo.Collection('posts');

this.Posts.attachSchema(this.Schema.Post);

this.Posts.before.insert(function(userId, post) {
    if (!post.attributedTo && userId) post.attributedTo = userId;
    if (!post.published) post.published = Date.now();
});
