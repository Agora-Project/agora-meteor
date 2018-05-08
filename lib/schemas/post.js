/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Schema || (this.Schema = {});

this.Schema.Post = new SimpleSchema({
    poster: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
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
    tags: {
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
    if (!post.poster && userId) post.poster = userId;
    post.published = Date.now();
});
