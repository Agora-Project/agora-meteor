/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
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
    },
    subtreeWidth: {
        type: Number,
        defaultValue: 1,
        decimal: true,
        optional: true
    },
    recentActivity: {
        type: Number,
        defaultValue: 100,
        decimal: true,
        optional: true
    }
});

this.Posts = new Mongo.Collection('posts');

this.Posts.attachSchema(this.Schema.Post);

this.Posts.before.insert(function(userId, post) {
    post.poster = userId;
    post.postedOn = Date.now();
});
