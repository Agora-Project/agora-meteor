/*
    Agora Forum Software
    Copyright (C) 2017 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

if (!this.Schema)
    this.Schema = {}; //If this.Schema hasn't been defined, make it an empty object.

this.Schema.Tag = new SimpleSchema({
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
