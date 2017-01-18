/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

this.Schema || (this.Schema = {});

this.Schema.Issue = new SimpleSchema({
    userID: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    targetID: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    content: {
        type: String,
        optional: true
    },
    submittedOn: {
        type: Date,
        optional: true
    },
});

this.Issues = new Mongo.Collection('issues');

this.Issues.attachSchema(this.Schema.Issue);

this.Issues.before.insert(function(userId, issue) {
    issue.userID = userId;
    issue.submittedOn = Date.now();
});
