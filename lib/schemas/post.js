/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

this.Schema || (this.Schema = {});

this.Schema.Vector2 = new SimpleSchema({
    x: {
        type: Number,
        decimal: true
    },
    y: {
        type: Number,
        decimal: true
    }
});

this.Schema.Post = new SimpleSchema({
    poster: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    title: {
        type: String,
        optional: true,
        max: 100
    },
    content: {
        type: String,
        min: 1,
        max: 100000
    },
    target: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    replies: {
        type: Array,
        optional: true
    },
    'replies.$': {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    postedOn: {
        type: Date,
        optional: true
    },
    lastEditedOn: {
        type: Date,
        optional: true
    },
    isLocked: {
        type: Boolean,
        optional: true,
    },
    defaultPosition: {
        type: this.Schema.Vector2,
        optional: true
    }
});

this.Posts = new Mongo.Collection('posts');

this.Posts.attachSchema(this.Schema.Post);

this.Posts.before.insert(function(userId, post) {
    post.poster = userId;
    if (!post.replies) post.replies = [];
    post.postedOn = Date.now();
});
