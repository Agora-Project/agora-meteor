/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

if (!this.Schema)
    this.Schema = {}; //If this.Schema hasn't been defined, make it an empty object.

this.Schema.Report = new SimpleSchema({
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
    summary: {
        type: String,
        optional: true
    },
    content: {
        type: String
    },
    submittedOn: {
        type: Date,
        optional: true
    },
    resolved: {
        type: Boolean,
        optional: true
    }
});

this.Reports = new Mongo.Collection('issues');

this.Reports.attachSchema(this.Schema.Report);

this.Reports.before.insert(function(userId, report) {
    report.userID = userId;
    report.submittedOn = Date.now();
});
