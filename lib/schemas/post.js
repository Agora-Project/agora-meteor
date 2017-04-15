/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

this.Schema || (this.Schema = {});

this.Schema.Link = new SimpleSchema({
    target: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    isAttack: {
        type: Boolean,
        optional: true
    }
});

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
    posterID: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    title: {
        type: String,
        optional: true
    },
    content: {
        type: String
    },
    links: {
        type: [this.Schema.Link]
    },
    replyIDs: {
        type: Array,
        optional: true
    },
    'replyIDs.$': {
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
    post.posterID = userId;
    if (!post.replyIDs) post.replyIDs = [];
    post.postedOn = Date.now();
});
