/*
    Agora Forum Software
    Copyright (C) 2017 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

this.Schema || (this.Schema = {});

this.Schema.Tag = new SimpleSchema({
    name: {
        type: String,
        min: 1,
        max: 1000
    },
    postNumber: {
        type: Number
    },
    posts: {
        type: Array,
        optional: true
    },
    'posts.$': {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    }
});

this.Tags = new Mongo.Collection('tags');

this.Tags.attachSchema(this.Schema.Tag);

this.Tags.before.insert(function(userId, tag) {
    if (!tag.posts) tag.posts = [];
    if (!tag.postNumber) tag.postNumber = 0;
});
