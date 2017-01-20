/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

this.Schema || (this.Schema = {});

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
    content: {
        type: String,
        optional: true
    },
    submittedOn: {
        type: Date,
        optional: true
    },
});

this.Reports = new Mongo.Collection('issues');

this.Reports.attachSchema(this.Schema.Report);

this.Reports.before.insert(function(userId, report) {
    report.userID = userId;
    report.submittedOn = Date.now();
});
