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
    x: {type: Number},
    y: {type: Number}
});

this.Schema.Post = new SimpleSchema({
    posterID: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    title: {
        type: String
    },
    content: {
        type: String,
        optional: true
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

this.Post = new Mongo.Collection('posts');

this.Post.attachSchema(this.Schema.Post);

this.Post.before.insert(function(userId, post) {
    post.posterID = userId;
    if (!post.replyIDs) post.replyIDs = [];
    post.postedOn = Date.now();
});
