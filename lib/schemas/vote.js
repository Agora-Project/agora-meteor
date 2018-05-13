/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

if (!this.Schema)
    this.Schema = {}; //If this.Schema hasn't been defined, make it an empty object.

this.Schema.Vote = new SimpleSchema({
    votableId: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    type: {
        type: Number
    },
    createdAt: {
        type: Date
    }
});

this.Vote = new Mongo.Collection('votes');

this.Vote.attachSchema(this.Schema.Vote);

this.Vote.before.insert(function(userId, vote) {
    return vote.createdAt = Date.now();
});
