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
        type: Array,
        optional: true
    },
    'tags.$': {
        type: String,
        regEx: /(^|\s)([a-z\d][\w-]*)/i
    },
    replies: {
        type: Array,
        defaultValue: [],
        optional: true
    },
    'replies.$': {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    published: {
        type: Date,
        optional: true,
        index: 1
    },
    lastEditedOn: {
        type: Date,
        optional: true
    },
    isLocked: {
        type: Boolean,
        optional: true,
    }
});

this.Posts = new Mongo.Collection('posts');

this.Posts.attachSchema(this.Schema.Post);

this.Posts.before.insert(function(userId, post) {
    if (!post.poster && userId) post.poster = userId;
    post.published = Date.now();
});
