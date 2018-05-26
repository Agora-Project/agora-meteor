/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Reports = new Mongo.Collection('issues');

this.Reports.before.insert(function(userId, report) {
    report.userID = userId;
    report.submittedOn = Date.now();
});
