Template.adminScreen.onCreated(function() {
    this.subscribe('reports');
});

Template.adminScreen.helpers({
    reports: function() {
        return Reports.find({$where: "!this.resolved"});
    }
});

Template.adminScreen.events({
});


Template.report.helpers({
    post: function() {
        let post = Posts.findOne({_id: this.targetID});
        return post;
    },
    user: function() {
        return Meteor.users.findOne(this.userID);
    }
});

Template.report.onCreated(function() {
    this.subscribe('post', this.data.targetID, this.data.userID);
});

Template.report.events({
    "click .report-resolve-button": function(event) {
        Meteor.call("resolveReport", this);
    }
});
