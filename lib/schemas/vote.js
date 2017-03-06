/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

this.Schema || (this.Schema = {});

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
